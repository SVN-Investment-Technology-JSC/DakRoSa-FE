import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RaciAssignment } from './raci-assignment.entity';
import { RoleLetterAllowlist } from './role-letter-allowlist.entity';
import { RoleLetter } from './role-letter';
import { WorkflowsService } from '../workflows/workflows.service';
import { OrgUnitsService } from '../org-units/org-units.service';
import { UpsertRaciCellDto } from './dto/upsert-raci-cell.dto';
import { WorkflowStep } from '../workflows/workflow-step.entity';

@Injectable()
export class RaciService {
  constructor(
    @InjectRepository(RaciAssignment)
    private readonly raciRepository: Repository<RaciAssignment>,
    @InjectRepository(RoleLetterAllowlist)
    private readonly allowlistRepository: Repository<RoleLetterAllowlist>,
    private readonly workflowsService: WorkflowsService,
    private readonly orgUnitsService: OrgUnitsService,
  ) {}

  async getRoleLetterOptions(workflowId: string): Promise<RoleLetter[]> {
    const kind = await this.workflowsService.getKind(workflowId);
    const rows = await this.allowlistRepository.find({ where: { workflowKind: kind } });
    return rows.map((r) => r.roleLetter);
  }

  async getValidRollbackTargets(workflowId: string, stepId: string): Promise<WorkflowStep[]> {
    const step = await this.workflowsService.findStepOrThrow(workflowId, stepId);
    return this.workflowsService.findPriorSteps(workflowId, step.stepOrder);
  }

  async replaceCellAssignments(
    workflowId: string,
    stepId: string,
    dto: UpsertRaciCellDto,
  ): Promise<RaciAssignment[]> {
    const step = await this.workflowsService.findStepOrThrow(workflowId, stepId);

    if (dto.positionId && dto.userId) {
      throw new BadRequestException(
        'Một ô chỉ được gán cho Chức vụ hoặc Cá nhân, không thể cả hai.',
      );
    }

    // Any level is a valid anchor — BRD's TH1 (assign while a department column
    // is collapsed) and TH2 (drill down to a position/person first) are the same
    // operation: tag whatever the current column represents.
    await this.orgUnitsService.findOne(dto.orgUnitId);

    const allowedLetters = new Set(await this.getRoleLetterOptions(workflowId));

    // The cell being replaced, expressed as an exact target triple.
    const cellTarget = {
      stepId,
      orgUnitId: dto.orgUnitId,
      positionId: dto.positionId ?? IsNull(),
      userId: dto.userId ?? IsNull(),
    };

    const hasNewC = dto.tags.some((t) => t.roleLetter === 'C');
    if (hasNewC) {
      const existingC = await this.raciRepository.findOne({ where: { stepId, roleLetter: 'C' } });
      const isSameCell =
        existingC &&
        existingC.orgUnitId === dto.orgUnitId &&
        (existingC.positionId ?? null) === (dto.positionId ?? null) &&
        (existingC.userId ?? null) === (dto.userId ?? null);
      if (existingC && !isSameCell) {
        throw new BadRequestException(
          'Mỗi bước chỉ được phép có tối đa 1 người duyệt (Chữ C). Vui lòng tách thành bước mới.',
        );
      }
    }

    const rows: RaciAssignment[] = [];
    for (const tag of dto.tags) {
      if (!allowedLetters.has(tag.roleLetter)) {
        throw new BadRequestException(
          `Role letter ${tag.roleLetter} is not allowed for this workflow's kind`,
        );
      }

      // BRD 2 US 1.2 — only managers may own the aggregate Node E, because they
      // are the ones who can break it down into E(x) for their subordinates.
      if (tag.roleLetter === 'E') {
        const receivers = await this.orgUnitsService.resolveAssignees({
          orgUnitId: dto.orgUnitId,
          positionId: dto.positionId,
          userId: dto.userId,
        });
        for (const receiver of receivers) {
          if (!(await this.orgUnitsService.hasSubordinates(receiver.userId))) {
            throw new BadRequestException(
              'Cấp bậc Nhân viên không được phép giữ Node E tổng. Chỉ có thể gán chữ E cho cấp Quản lý',
            );
          }
        }
      }

      let fixedRollbackStepId: string | null = null;
      if (tag.roleLetter === 'C') {
        if (!tag.fixedRollbackStepId) {
          throw new BadRequestException('Role C tags require a fixedRollbackStepId');
        }
        await this.workflowsService.assertPriorStep(workflowId, tag.fixedRollbackStepId, step.stepOrder);
        fixedRollbackStepId = tag.fixedRollbackStepId;
      }
      // Role A never stores a fixed target — chosen live at reject-time instead.
      // (This is also why the BRD's "C(End)" variant is not implemented: Role A
      // already covers "rejector decides where it goes", making C(End) redundant.)

      rows.push(
        this.raciRepository.create({
          stepId,
          orgUnitId: dto.orgUnitId,
          positionId: dto.positionId ?? null,
          userId: dto.userId ?? null,
          roleLetter: tag.roleLetter,
          fixedRollbackStepId,
        }),
      );
    }

    await this.raciRepository.manager.transaction(async (manager) => {
      await manager.delete(RaciAssignment, cellTarget);
      if (rows.length > 0) {
        await manager.save(RaciAssignment, rows);
      }
    });

    return this.raciRepository.find({
      where: cellTarget,
      relations: ['orgUnit', 'position', 'user', 'fixedRollbackStep'],
    });
  }
}
