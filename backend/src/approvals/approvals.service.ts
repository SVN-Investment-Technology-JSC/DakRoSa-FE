import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApprovalAction } from './approval-action.entity';
import { TaskStepInstance } from '../tasks/task-step-instance.entity';
import { TaskInstance } from '../tasks/task-instance.entity';
import { TaskStepAssignee } from '../tasks/task-step-assignee.entity';
import { isActionableStepStatus } from '../tasks/task-status';
import { completeStepAndAdvance } from '../tasks/step-progression';
import { ActivityService } from '../activity/activity.service';
import { RaciAssignment } from '../raci/raci-assignment.entity';
import { TasksService } from '../tasks/tasks.service';
import { OrgUnitsService } from '../org-units/org-units.service';
import { ApproveStepDto } from './dto/approve-step.dto';
import { RejectStepDto } from './dto/reject-step.dto';
import { DelegateStepDto } from './dto/delegate-step.dto';
import type { RoleLetter } from '../raci/role-letter';

export interface DelegationCandidate {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
  positionName?: string;
  orgUnitTitle?: string;
}

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalAction)
    private readonly approvalActionsRepository: Repository<ApprovalAction>,
    @InjectRepository(TaskStepInstance)
    private readonly stepsRepository: Repository<TaskStepInstance>,
    @InjectRepository(TaskStepAssignee)
    private readonly assigneesRepository: Repository<TaskStepAssignee>,
    @InjectRepository(RaciAssignment)
    private readonly raciRepository: Repository<RaciAssignment>,
    private readonly tasksService: TasksService,
    private readonly orgUnitsService: OrgUnitsService,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  async getValidRollbackTargets(taskId: string, stepId: string): Promise<TaskStepInstance[]> {
    const step = await this.findStepOrThrow(taskId, stepId);
    return this.stepsRepository.find({
      where: { taskId },
      order: { stepOrder: 'ASC' },
    }).then((steps) => steps.filter((s) => s.stepOrder < step.stepOrder));
  }

  async approveStep(
    taskId: string,
    stepId: string,
    actorUserId: string,
    heldLetters: RoleLetter[],
    dto: ApproveStepDto,
  ): Promise<TaskInstance> {
    const step = await this.findStepOrThrow(taskId, stepId);
    if (!isActionableStepStatus(step.status)) {
      throw new BadRequestException('This step is not currently actionable');
    }

    const roleLetter = this.resolveActingLetter(heldLetters, dto.roleLetter, heldLetters);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(ApprovalAction, {
        taskStepInstanceId: step.id,
        actorUserId,
        action: 'APPROVE',
        roleLetterActedAs: roleLetter,
        targetStepInstanceId: null,
        notes: dto.notes ?? null,
      });

      // BRD AND-logic: when a step has multiple R (Review) holders, ALL of them
      // must approve before the step completes and the run advances. Steps with
      // 0 or 1 R holder behave exactly as before (this action alone completes it).
      const rAssignees = await manager.find(TaskStepAssignee, {
        where: { taskStepInstanceId: step.id, roleLetter: 'R' },
      });
      if (rAssignees.length > 1) {
        const rApprovals = await manager.find(ApprovalAction, {
          where: { taskStepInstanceId: step.id, action: 'APPROVE', roleLetterActedAs: 'R' },
        });
        const approvedUserIds = new Set(rApprovals.map((a) => a.actorUserId));
        const allRDone = rAssignees.every((a) => approvedUserIds.has(a.userId));
        if (!allRDone) {
          await manager.update(TaskStepInstance, step.id, {
            progress: Math.round((100 * approvedUserIds.size) / rAssignees.length),
          });
          await this.activityService.record(
            {
              taskId,
              stepId: step.id,
              actorUserId,
              action: 'step.approved_partial',
              summary: `Phê duyệt (vai trò ${roleLetter}) bước "${step.stepName}" — còn chờ ${rAssignees.length - approvedUserIds.size}/${rAssignees.length} người giữ R.`,
              metadata: { roleLetter, approved: approvedUserIds.size, total: rAssignees.length },
            },
            manager,
          );
          return;
        }
      }

      await completeStepAndAdvance(manager, taskId, step);
      await this.activityService.record(
        {
          taskId,
          stepId: step.id,
          actorUserId,
          action: 'step.approved',
          summary: `Phê duyệt (vai trò ${roleLetter}) bước "${step.stepName}" — bước hoàn tất.`,
          metadata: { roleLetter, notes: dto.notes ?? null },
        },
        manager,
      );
    });

    // Spawn any linked sub-flows only after the approval is safely committed.
    // Deliberately outside the transaction: a spawn failure must not undo the
    // approval. The spawn is idempotent per step, so it can be retried later
    // without creating duplicates.
    try {
      await this.tasksService.spawnSubFlowsForCompletedSteps(taskId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `Approval on task ${taskId} succeeded but spawning its Execution Flow failed; ` +
          `the parent task is Completed and the spawn can be retried.`,
        err,
      );
    }

    return this.tasksService.findOne(taskId);
  }

  async rejectStep(
    taskId: string,
    stepId: string,
    actorUserId: string,
    heldLetters: RoleLetter[],
    dto: RejectStepDto,
  ): Promise<TaskInstance> {
    const step = await this.findStepOrThrow(taskId, stepId);
    if (!isActionableStepStatus(step.status)) {
      throw new BadRequestException('This step is not currently actionable');
    }

    const rejectCapableLetters = heldLetters.filter((l) => l === 'A' || l === 'C');
    if (rejectCapableLetters.length === 0) {
      throw new BadRequestException('Only Role A (Approve) or Role C (Checker) can reject a step');
    }
    const roleLetter = this.resolveActingLetter(rejectCapableLetters, dto.roleLetter, rejectCapableLetters);

    let targetStep: TaskStepInstance;
    if (roleLetter === 'C') {
      // Role C: fixed rollback target is a design-time constant — any client-supplied
      // targetStepId is ignored, never trusted.
      if (dto.targetStepId) {
        // eslint-disable-next-line no-console
        console.warn(
          `Ignoring client-supplied targetStepId for a Role C rejection on step ${step.id}; using the workflow's fixed rollback target instead.`,
        );
      }
      if (!step.workflowStepId) {
        throw new BadRequestException('This step has no linked workflow template step to resolve a fixed rollback from');
      }
      const cAssignment = await this.raciRepository.findOne({
        where: { stepId: step.workflowStepId, roleLetter: 'C' },
      });
      if (!cAssignment?.fixedRollbackStepId) {
        throw new BadRequestException('No fixed rollback target is configured for this Role C step');
      }
      const found = await this.stepsRepository.findOne({
        where: { taskId, workflowStepId: cAssignment.fixedRollbackStepId },
      });
      if (!found) {
        throw new BadRequestException('The configured fixed rollback target step could not be resolved on this task');
      }
      targetStep = found;
    } else {
      // Role A: the approver chooses the rollback target live, at reject-time.
      if (!dto.targetStepId) {
        throw new BadRequestException('targetStepId is required when rejecting as Role A');
      }
      const found = await this.stepsRepository.findOne({ where: { id: dto.targetStepId, taskId } });
      if (!found) {
        throw new BadRequestException(`Target step ${dto.targetStepId} not found on this task`);
      }
      if (found.stepOrder >= step.stepOrder) {
        throw new BadRequestException('Target step must precede the step being rejected');
      }
      targetStep = found;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(ApprovalAction, {
        taskStepInstanceId: step.id,
        actorUserId,
        action: 'REJECT',
        roleLetterActedAs: roleLetter,
        targetStepInstanceId: roleLetter === 'A' ? targetStep.id : null,
        notes: dto.notes,
      });

      // Target step becomes the new active step; every step strictly after it
      // up to and including the rejecting step resets to Pending. Steps before
      // the target are left untouched.
      //
      // BRD 2 US 1.5 AC2: when the target is a Node E, it goes to `Rework`
      // rather than plain `In Progress`, so the UI can show that the manager is
      // redoing rejected work rather than starting it fresh.
      const targetIsNodeE = await manager.count(TaskStepAssignee, {
        where: { taskStepInstanceId: targetStep.id, roleLetter: 'E' },
      });
      await manager.update(TaskStepInstance, targetStep.id, {
        status: targetIsNodeE > 0 ? 'Rework' : 'In Progress',
        progress: 0,
      });
      await manager
        .createQueryBuilder()
        .update(TaskStepInstance)
        .set({ status: 'Pending', progress: 0 })
        .where('task_id = :taskId', { taskId })
        .andWhere('step_order > :targetOrder', { targetOrder: targetStep.stepOrder })
        .andWhere('step_order <= :rejectOrder', { rejectOrder: step.stepOrder })
        .execute();

      await manager.update(TaskInstance, taskId, { status: 'Active' });

      await this.activityService.record(
        {
          taskId,
          stepId: step.id,
          actorUserId,
          action: 'step.rejected',
          summary:
            `Từ chối (vai trò ${roleLetter}) bước "${step.stepName}" → quay về bước ` +
            `"${targetStep.stepName}"` +
            (roleLetter === 'C' ? ' (bước cố định trong quy trình).' : ' (do người từ chối chọn).') +
            (dto.notes ? ` Lý do: ${dto.notes}` : ''),
          metadata: { roleLetter, targetStepId: targetStep.id, notes: dto.notes ?? null },
        },
        manager,
      );
    });

    return this.tasksService.findOne(taskId);
  }

  /**
   * BRD 3.2 AC1 — who this step's holder may hand it to. Resolved by
   * `OrgUnitsService.findSubordinates`, the same list the Node E breakdown
   * uses, so delegation and breakdown can never disagree about who is a
   * subordinate.
   */
  async getDelegationCandidates(
    taskId: string,
    stepId: string,
    callerUserId: string,
  ): Promise<DelegationCandidate[]> {
    await this.findStepOrThrow(taskId, stepId);
    return this.orgUnitsService.findSubordinates(callerUserId);
  }

  async delegateStep(
    taskId: string,
    stepId: string,
    callerUserId: string,
    heldLetters: RoleLetter[],
    dto: DelegateStepDto,
  ): Promise<TaskInstance> {
    const step = await this.findStepOrThrow(taskId, stepId);

    const delegateCapableLetters = heldLetters.filter((l) => l === 'R' || l === 'C');
    if (delegateCapableLetters.length === 0) {
      throw new BadRequestException('Only Role R (Review) or Role C (Checker) holders can delegate a step');
    }
    const roleLetter = this.resolveActingLetter(delegateCapableLetters, dto.roleLetter, delegateCapableLetters);

    const candidates = await this.getDelegationCandidates(taskId, stepId, callerUserId);
    if (!candidates.some((c) => c.id === dto.toUserId)) {
      throw new BadRequestException(
        `User ${dto.toUserId} is not a valid delegation target (must be a head of a subordinate org unit)`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(TaskStepAssignee, {
        taskStepInstanceId: step.id,
        userId: callerUserId,
        roleLetter,
      });
      await manager.save(TaskStepAssignee, {
        taskStepInstanceId: step.id,
        userId: dto.toUserId,
        roleLetter,
        isEscalated: false,
        delegatedFromUserId: callerUserId,
      });

      const target = candidates.find((c) => c.id === dto.toUserId);
      await this.activityService.record(
        {
          taskId,
          stepId: step.id,
          actorUserId: callerUserId,
          action: 'step.delegated',
          summary: `Giao lại vai trò ${roleLetter} ở bước "${step.stepName}" cho ${target?.fullName ?? dto.toUserId}.`,
          metadata: { roleLetter, toUserId: dto.toUserId },
        },
        manager,
      );
    });

    return this.tasksService.findOne(taskId);
  }

  private async findStepOrThrow(taskId: string, stepId: string): Promise<TaskStepInstance> {
    const step = await this.stepsRepository.findOne({ where: { id: stepId, taskId } });
    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found on task ${taskId}`);
    }
    return step;
  }

  private resolveActingLetter(
    candidates: RoleLetter[],
    requested: RoleLetter | undefined,
    heldLetters: RoleLetter[],
  ): RoleLetter {
    if (requested) {
      if (!heldLetters.includes(requested)) {
        throw new BadRequestException(`You do not hold role letter ${requested} on this step`);
      }
      if (!candidates.includes(requested)) {
        throw new BadRequestException(`Role letter ${requested} cannot perform this action`);
      }
      return requested;
    }
    if (candidates.length === 1) {
      return candidates[0];
    }
    throw new BadRequestException(
      `You hold multiple applicable role letters (${candidates.join(', ')}) on this step — specify roleLetter explicitly`,
    );
  }
}
