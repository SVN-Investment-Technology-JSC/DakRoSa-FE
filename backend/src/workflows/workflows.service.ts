import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from './workflow.entity';
import { WorkflowStep } from './workflow-step.entity';
import { RaciAssignment } from '../raci/raci-assignment.entity';
import { OrgUnitsService } from '../org-units/org-units.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto';
import { UpdateWorkflowStepDto } from './dto/update-workflow-step.dto';
import { WorkflowKind } from './workflow-kind';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
    @InjectRepository(WorkflowStep)
    private readonly stepsRepository: Repository<WorkflowStep>,
    @InjectRepository(RaciAssignment)
    private readonly raciRepository: Repository<RaciAssignment>,
    private readonly orgUnitsService: OrgUnitsService,
  ) {}

  async findAll(kind?: WorkflowKind, submittableByUserId?: string): Promise<Workflow[]> {
    const workflows = await this.workflowsRepository.find({
      where: kind ? { kind } : {},
      order: { name: 'ASC' },
    });
    if (!submittableByUserId) return workflows;
    return this.filterSubmittableBy(workflows, submittableByUserId);
  }

  /**
   * Chỉ giữ những quy trình mà `userId` thực sự mở đơn được — tức là có ít nhất
   * một bước gắn chữ **S** phân giải ra đúng người này.
   *
   * Lọc ở server chứ không ở giao diện: danh sách này quyết định `POST /tasks`
   * gọi được với luồng nào, nên để client tự đoán thì một người không giữ S vẫn
   * mở được đơn bằng cách gọi thẳng API.
   *
   * Phân giải qua `OrgUnitsService.resolveAssignees` (chứ không so `orgUnitId`
   * cho nhanh) để dùng chung đúng một luật với lúc tạo đơn: S gán cho một Ban là
   * cả Ban kể cả các Tổ bên dưới, và ghế trưởng trống thì đẩy lên cấp trên.
   */
  private async filterSubmittableBy(
    workflows: Workflow[],
    userId: string,
  ): Promise<Workflow[]> {
    if (workflows.length === 0) return workflows;

    const sTags = await this.raciRepository
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.step', 's')
      .where('a.roleLetter = :letter', { letter: 'S' })
      .andWhere('s.workflowId IN (:...ids)', { ids: workflows.map((w) => w.id) })
      .getMany();

    // Nhiều bước thường trỏ về cùng một đích; phân giải mỗi đích đúng một lần.
    const resolvedTargets = new Map<string, boolean>();
    const submittable = new Set<string>();

    for (const tag of sTags) {
      const key = `${tag.orgUnitId}|${tag.positionId ?? ''}|${tag.userId ?? ''}`;
      let holdsS = resolvedTargets.get(key);
      if (holdsS === undefined) {
        const receivers = await this.orgUnitsService.resolveAssignees({
          orgUnitId: tag.orgUnitId,
          positionId: tag.positionId,
          userId: tag.userId,
          roleLetter: 'S',
        });
        holdsS = receivers.some((r) => r.userId === userId);
        resolvedTargets.set(key, holdsS);
      }
      if (holdsS) submittable.add(tag.step.workflowId);
    }

    return workflows.filter((w) => submittable.has(w.id));
  }

  /** 403 khi `userId` không giữ chữ S ở bất kỳ bước nào của luồng. */
  async assertSubmittableBy(workflowId: string, userId: string): Promise<void> {
    const workflow = await this.workflowsRepository.findOne({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundException(`Workflow ${workflowId} not found`);
    const allowed = await this.filterSubmittableBy([workflow], userId);
    if (allowed.length === 0) {
      throw new ForbiddenException(
        `Bạn không giữ vai trò Đề xuất (S) ở quy trình "${workflow.name}" nên không thể tạo đơn cho quy trình này.`,
      );
    }
  }

  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowsRepository.findOne({
      where: { id },
      relations: [
        'steps',
        'steps.raciAssignments',
        'steps.raciAssignments.orgUnit',
        'steps.raciAssignments.position',
        'steps.raciAssignments.user',
        'steps.raciAssignments.fixedRollbackStep',
      ],
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    workflow.steps?.sort((a, b) => a.stepOrder - b.stepOrder);
    return workflow;
  }

  async getKind(id: string): Promise<WorkflowKind> {
    const workflow = await this.workflowsRepository.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    return workflow.kind;
  }

  create(dto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = this.workflowsRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      kind: dto.kind,
    });
    return this.workflowsRepository.save(workflow);
  }

  async addStep(workflowId: string, dto: CreateWorkflowStepDto): Promise<WorkflowStep> {
    await this.findOne(workflowId);
    const step = this.stepsRepository.create({
      workflowId,
      stepOrder: dto.stepOrder,
      stepCode: dto.stepCode,
      stepName: dto.stepName,
      icon: dto.icon ?? null,
      linkedSubFlowId: dto.linkedSubFlowId ?? null,
    });
    return this.stepsRepository.save(step);
  }

  /**
   * BRD 2 Rule 4 / US 1.5 AC1 — every Node E must be immediately followed by a
   * Node C, so execution results always hit a gate before the flow moves on.
   *
   * Deliberately NOT enforced while editing the matrix (that would make it
   * impossible to place an E before its C exists). It is enforced where it
   * actually matters: a workflow that breaks the rule cannot be started.
   */
  async validate(workflowId: string): Promise<{ valid: boolean; errors: string[] }> {
    const workflow = await this.findOne(workflowId);
    const steps = [...(workflow.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
    const errors: string[] = [];

    const hasLetter = (step: WorkflowStep | undefined, letter: string) =>
      !!step && (step.raciAssignments ?? []).some((a) => a.roleLetter === letter);

    steps.forEach((step, index) => {
      if (!hasLetter(step, 'E')) return;
      if (!hasLetter(steps[index + 1], 'C')) {
        errors.push(
          `Bước ${step.stepCode} (${step.stepName}) có Node E nhưng bước liền sau không có Node C. ` +
            'Node E bắt buộc phải được theo sau bởi một Node C.',
        );
      }
    });

    return { valid: errors.length === 0, errors };
  }

  async assertExecutable(workflowId: string): Promise<void> {
    const { valid, errors } = await this.validate(workflowId);
    if (!valid) throw new BadRequestException(errors.join(' '));
  }

  async updateStep(
    workflowId: string,
    stepId: string,
    dto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStep> {
    const step = await this.findStepOrThrow(workflowId, stepId);

    if (dto.linkedSubFlowId) {
      if (dto.linkedSubFlowId === workflowId) {
        throw new BadRequestException('Một quy trình không thể tự liên kết vào chính nó.');
      }
      // Must exist — findOne throws NotFound otherwise.
      const subFlow = await this.findOne(dto.linkedSubFlowId);
      if (subFlow.kind === 'process') {
        throw new BadRequestException(
          'Luồng con phải là một Luồng Thực thi, không thể là một Quy trình phê duyệt.',
        );
      }
      await this.assertSubFlowPlacement(workflowId, step);
    }

    if (dto.stepName !== undefined) step.stepName = dto.stepName;
    if (dto.icon !== undefined) step.icon = dto.icon;
    if (dto.linkedSubFlowId !== undefined) step.linkedSubFlowId = dto.linkedSubFlowId;

    return this.stepsRepository.save(step);
  }

  /**
   * Where a sub-flow may be attached.
   *
   * - **Quy trình (process)**: only on the LAST step, and only if that step
   *   carries Role A. The meaning is "once this approval workflow is signed
   *   off, an execution work order appears" — which is only well-defined at the
   *   final approval, so allowing it mid-workflow would create a work order for
   *   an approval that can still be rejected and rolled back.
   * - **Luồng Thực thi (maintenance kinds)**: any step. A sub-flow there is a
   *   child flow of that particular step, not a hand-off at the end.
   */
  private async assertSubFlowPlacement(workflowId: string, step: WorkflowStep): Promise<void> {
    const workflow = await this.findOne(workflowId);
    if (workflow.kind !== 'process') return;

    const steps = [...(workflow.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
    const last = steps[steps.length - 1];
    if (!last || last.id !== step.id) {
      throw new BadRequestException(
        'Với Quy trình, chỉ được gắn Luồng Thực thi vào bước cuối cùng (bước phê duyệt Role A).',
      );
    }
    // `last` comes from findOne(), which eager-loads raciAssignments; the
    // caller's `step` comes from findStepOrThrow(), which does not.
    const hasA = (last.raciAssignments ?? []).some((a) => a.roleLetter === 'A');
    if (!hasA) {
      throw new BadRequestException(
        'Bước cuối phải giữ vai trò A (Phê duyệt) trước khi gắn được Luồng Thực thi.',
      );
    }
  }

  async findStepOrThrow(workflowId: string, stepId: string): Promise<WorkflowStep> {
    const step = await this.stepsRepository.findOne({ where: { id: stepId, workflowId } });
    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found on workflow ${workflowId}`);
    }
    return step;
  }

  async findPriorSteps(workflowId: string, stepOrder: number): Promise<WorkflowStep[]> {
    return this.stepsRepository.find({
      where: { workflowId },
      order: { stepOrder: 'ASC' },
    }).then((steps) => steps.filter((s) => s.stepOrder < stepOrder));
  }

  async assertPriorStep(workflowId: string, candidateStepId: string, beforeStepOrder: number): Promise<void> {
    const candidate = await this.stepsRepository.findOne({
      where: { id: candidateStepId, workflowId },
    });
    if (!candidate) {
      throw new BadRequestException(`Rollback target step ${candidateStepId} not found on this workflow`);
    }
    if (candidate.stepOrder >= beforeStepOrder) {
      throw new BadRequestException(
        `Rollback target step must precede the current step (order ${candidate.stepOrder} is not before ${beforeStepOrder})`,
      );
    }
  }
}
