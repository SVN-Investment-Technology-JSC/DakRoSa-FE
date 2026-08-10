import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RaciAssignment } from './raci-assignment.entity';
import { RoleLetterAllowlist } from './role-letter-allowlist.entity';
import { RoleLetter } from './role-letter';
import { WorkflowsService } from '../workflows/workflows.service';
import { OrgUnitsService } from '../org-units/org-units.service';
import { RaciTagDto, UpsertRaciCellDto } from './dto/upsert-raci-cell.dto';
import { WorkflowStep } from '../workflows/workflow-step.entity';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { DEFAULT_E_TASK_SOURCE, E_TASK_SOURCE_LABEL, E_TASK_SOURCES } from './e-task-source';
import type { ETaskSource } from './e-task-source';
import type { EquipmentTaskTemplate } from '../maintenance/asset';

@Injectable()
export class RaciService {
  constructor(
    @InjectRepository(RaciAssignment)
    private readonly raciRepository: Repository<RaciAssignment>,
    @InjectRepository(RoleLetterAllowlist)
    private readonly allowlistRepository: Repository<RoleLetterAllowlist>,
    private readonly workflowsService: WorkflowsService,
    private readonly orgUnitsService: OrgUnitsService,
    private readonly maintenanceService: MaintenanceService,
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

  /**
   * BRD 3 US 3.1 AC2/AC3 — ba tùy chọn của dropdown Role E, kèm việc tùy chọn
   * "Mặc định theo thiết bị" có dùng được hay không.
   *
   * Lúc thiết kế luồng chưa biết Lệnh công việc sẽ thuộc thiết bị nào, nên câu
   * hỏi được đặt lại thành câu trả lời được ngay: có thiết bị nào đang trỏ vào
   * luồng này ở Ma trận bảo trì và đã khai JSON danh sách nhiệm vụ chưa. Chưa
   * có ⇒ tùy chọn bị mờ, kèm lý do để người dùng biết phải đi cấu hình ở đâu.
   */
  async getETaskSourceOptions(workflowId: string): Promise<{
    options: Array<{
      value: ETaskSource;
      label: string;
      enabled: boolean;
      disabledReason?: string;
    }>;
    devices: Array<{ id: string; code: string; name: string; taskCount: number }>;
  }> {
    await this.workflowsService.findOne(workflowId); // 404 nếu luồng không tồn tại
    const devices = await this.maintenanceService.findDeviceTemplateSources(workflowId);

    return {
      devices,
      options: E_TASK_SOURCES.map((value) => ({
        value,
        label: E_TASK_SOURCE_LABEL[value],
        enabled: value !== 'device_default' || devices.length > 0,
        disabledReason:
          value === 'device_default' && devices.length === 0
            ? 'Chưa có thiết bị nào gắn luồng này khai "Danh sách nhiệm vụ". Vào Ma trận bảo trì thiết bị → cột "Luồng Thực thi khi tạo Lệnh" → "Thêm thông tin công việc" để cấu hình trước.'
            : undefined,
      })),
    };
  }

  /**
   * Kiểm tra và chuẩn hoá cấu hình nguồn công việc của một tag trước khi lưu.
   * `manual` được lưu thành NULL để tag E cũ (chưa từng khai gì) và tag E chọn
   * "Thiết lập thủ công" là một, thay vì hai trạng thái chạy giống hệt nhau.
   */
  private async resolveETaskSource(
    workflowId: string,
    tag: RaciTagDto,
  ): Promise<{ eTaskSource: ETaskSource | null; eTaskList: EquipmentTaskTemplate | null }> {
    if (tag.roleLetter !== 'E') return { eTaskSource: null, eTaskList: null };

    const source = tag.eTaskSource ?? DEFAULT_E_TASK_SOURCE;

    if (source === 'device_default') {
      const devices = await this.maintenanceService.findDeviceTemplateSources(workflowId);
      if (devices.length === 0) {
        throw new BadRequestException(
          'Không dùng được "Mặc định theo thiết bị": chưa có thiết bị nào gắn luồng này khai Danh sách nhiệm vụ ở Ma trận bảo trì thiết bị.',
        );
      }
      return { eTaskSource: 'device_default', eTaskList: null };
    }

    if (source === 'task_list') {
      if (!tag.eTaskList || tag.eTaskList.length === 0) {
        throw new BadRequestException(
          'Chọn "Nhập danh sách công việc" thì phải khai ít nhất một nhiệm vụ.',
        );
      }
      const duplicate = tag.eTaskList.find(
        (t, i) => tag.eTaskList!.findIndex((o) => o.title.trim() === t.title.trim()) !== i,
      );
      if (duplicate) {
        throw new BadRequestException(`Nhiệm vụ "${duplicate.title}" bị khai hai lần.`);
      }
      return { eTaskSource: 'task_list', eTaskList: tag.eTaskList };
    }

    return { eTaskSource: null, eTaskList: null };
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
      } else if (tag.eTaskSource || tag.eTaskList) {
        throw new BadRequestException(
          'Nguồn dữ liệu công việc chỉ khai được cho vai trò Thực thi (E).',
        );
      }

      const { eTaskSource, eTaskList } = await this.resolveETaskSource(workflowId, tag);

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
          eTaskSource,
          eTaskList,
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
