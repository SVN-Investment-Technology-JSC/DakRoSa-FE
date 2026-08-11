import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { randomUUID } from 'crypto';
import { TaskInstance } from './task-instance.entity';
import { TaskStepInstance } from './task-step-instance.entity';
import { TaskStepAssignee } from './task-step-assignee.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { WorkflowsService } from '../workflows/workflows.service';
import { OrgUnitsService } from '../org-units/org-units.service';
import { ActivityService } from '../activity/activity.service';
import { UsersService } from '../users/users.service';
import { OrgUnit } from '../org-units/org-unit.entity';
import type { TaskStatus } from './task-status';
import type { TaskOrigin } from './task-origin';
import type { RoleLetter } from '../raci/role-letter';
import type { EquipmentTaskTemplate } from '../maintenance/asset';

export interface FindAllTasksFilter {
  status?: TaskStatus;
  assignedToMe?: boolean;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskInstance)
    private readonly tasksRepository: Repository<TaskInstance>,
    @InjectRepository(TaskStepInstance)
    private readonly stepsRepository: Repository<TaskStepInstance>,
    @InjectRepository(TaskStepAssignee)
    private readonly assigneesRepository: Repository<TaskStepAssignee>,
    private readonly workflowsService: WorkflowsService,
    private readonly orgUnitsService: OrgUnitsService,
    private readonly activityService: ActivityService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(filter: FindAllTasksFilter, userId: string): Promise<TaskInstance[]> {
    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.initiator', 'initiator')
      .leftJoinAndSelect('task.orgUnit', 'orgUnit')
      .leftJoinAndSelect('task.workflow', 'workflow')
      .orderBy('task.createdAt', 'DESC');

    if (filter.status) {
      qb.andWhere('task.status = :status', { status: filter.status });
    }
    if (filter.assignedToMe) {
      qb.innerJoin('task.steps', 'activeStep', 'activeStep.status = :inProgress', {
        inProgress: 'In Progress',
      }).innerJoin('activeStep.assignees', 'assignee', 'assignee.user_id = :userId', { userId });
    }

    await this.applyOrgUnitScope(qb, userId);

    return qb.getMany();
  }

  /**
   * Workspace chỉ hiện công việc mà ĐƠN VỊ NHỎ NHẤT của người dùng có tham gia.
   *
   * "Tham gia" nghĩa là một trong ba điều — đơn hướng về chính đơn vị đó, người
   * dùng tự mở đơn, hoặc một thành viên bất kỳ của đơn vị đang giữ role ở một
   * bước nào đó. Điều kiện thứ ba mới là điều kiện chính: nó cho cả tổ nhìn
   * thấy đơn của tổ mình chứ không chỉ riêng người được giao.
   *
   * Ba trường hợp KHÔNG lọc:
   *  - `admin` — quản trị viên phải thấy toàn hệ thống.
   *  - Người không thuộc đơn vị nào (chưa được xếp vào tổ). Lọc theo tập rỗng
   *    sẽ cho họ một Workspace trắng, không phân biệt được với "hệ thống hỏng".
   *  - `assignedToMe` — đã hẹp hơn hẳn, thêm lọc đơn vị chỉ tốn một join.
   */
  private async applyOrgUnitScope(
    qb: SelectQueryBuilder<TaskInstance>,
    userId: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if ((user?.roles ?? []).some((r) => r.name === 'admin')) return;

    const unit = await this.orgUnitsService.findSmallestUnitOfUser(userId);
    if (!unit) return;

    const memberIds = new Set<string>([userId]);
    for (const m of await this.orgUnitsService.findMembers(unit.id)) memberIds.add(m.userId);
    if (unit.headUserId) memberIds.add(unit.headUserId);
    // Cấp dưới cũng tính là "đơn vị mình tham gia": khi trưởng đơn vị giao việc
    // xuống tổ nhỏ hơn, người giữ role đổi sang nhân viên tổ đó — nếu chỉ lọc
    // theo đúng roster của đơn vị mình thì đơn vừa giao đi sẽ biến mất khỏi
    // Workspace của chính người đã giao.
    const descendantIds = new Set<string>();
    for (const m of await this.orgUnitsService.findDescendantMembers(unit.id)) {
      memberIds.add(m.userId);
      descendantIds.add(m.orgUnitId);
    }
    for (const d of await this.orgUnitsService.findDescendants(unit.id)) {
      if (d.headUserId) memberIds.add(d.headUserId);
      descendantIds.add(d.id);
    }

    qb.andWhere(
      `(task.orgUnitId IN (:...scopeUnitIds)
        OR task.initiatorUserId IN (:...scopeUserIds)
        OR EXISTS (
          SELECT 1 FROM task_step_instances scoped_step
          JOIN task_step_assignees scoped_assignee
            ON scoped_assignee.task_step_instance_id = scoped_step.id
          WHERE scoped_step.task_id = task.id
            AND scoped_assignee.user_id IN (:...scopeUserIds)
        ))`,
      { scopeUnitIds: [unit.id, ...descendantIds], scopeUserIds: [...memberIds] },
    );
  }

  async findOne(id: string): Promise<TaskInstance> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: [
        'initiator',
        'orgUnit',
        'workflow',
        'steps',
        'steps.workflowStep',
        'steps.assignees',
        'steps.assignees.user',
        'steps.assignees.delegatedFromUser',
      ],
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    task.steps?.sort((a, b) => a.stepOrder - b.stepOrder);
    return task;
  }

  /**
   * BRD 2 Flow 1: once a parent workflow finishes its final approval, spawn the
   * Execution Flow that its last step points at (`linked_sub_flow_id`).
   *
   * Runs AFTER the approval transaction has committed, so a failure here can
   * never roll back a legitimate approval. It is therefore made idempotent —
   * it refuses to spawn twice for the same parent — so a failed attempt can be
   * safely retried later without producing duplicates.
   */
  /**
   * BRD 2 Flow 1 + sub-flow links: spawn the child flow of every COMPLETED step
   * that has one configured and has not spawned it yet.
   *
   *  - Quy trình (process): the link may only sit on the last, Role-A step, so
   *    in practice this fires exactly when the approval workflow is signed off.
   *  - Luồng Thực thi: any step may carry a link, so a mid-flow step completing
   *    opens its own child flow.
   *
   * Runs AFTER the caller's transaction has committed, so a failure here can
   * never roll back a legitimate approval or submission. Idempotency is per
   * STEP, recorded in `task_step_instances.linked_sub_flow_task_id` — a retry
   * therefore cannot produce duplicates.
   */
  async spawnSubFlowsForCompletedSteps(parentTaskId: string): Promise<TaskInstance[]> {
    const parent = await this.tasksRepository.findOne({ where: { id: parentTaskId } });
    if (!parent?.workflowId) return [];

    const workflow = await this.workflowsService.findOne(parent.workflowId);
    const linkByTemplateStep = new Map(
      (workflow.steps ?? [])
        .filter((s) => s.linkedSubFlowId)
        .map((s) => [s.id, { subFlowId: s.linkedSubFlowId as string, stepName: s.stepName }]),
    );
    if (linkByTemplateStep.size === 0) return [];

    const steps = await this.stepsRepository.find({ where: { taskId: parentTaskId } });
    const spawned: TaskInstance[] = [];

    for (const step of steps.sort((a, b) => a.stepOrder - b.stepOrder)) {
      if (step.status !== 'Completed' || step.linkedSubFlowTaskId) continue;
      const link = step.workflowStepId ? linkByTemplateStep.get(step.workflowStepId) : undefined;
      if (!link) continue;

      const child = await this.create(
        {
          workflowId: link.subFlowId,
          title: `[Thực thi] ${parent.title}`,
          referenceCode: parent.taskCode,
          referenceTitle: `${link.stepName} — ${parent.title}`,
          orgUnitId: parent.orgUnitId,
          priority: parent.priority,
          description: parent.description ?? undefined,
        },
        parent.initiatorUserId,
        { parentTaskId: parent.id, origin: 'auto_from_parent' },
      );
      await this.stepsRepository.update(step.id, { linkedSubFlowTaskId: child.id });
      spawned.push(child);
    }

    return spawned;
  }

  async create(
    dto: CreateTaskDto,
    initiatorUserId: string,
    meta?: {
      parentTaskId?: string;
      origin?: TaskOrigin;
      parentMaintenanceTicketId?: string;
      /**
       * US 2.3: whoever raised the Work Order owns the Node E, regardless of
       * what the workflow's RACI would have resolved to.
       */
      nodeEOwnerUserId?: string;
      /** BRD 3 US 2.1 AC2 — thiết bị sinh ra Lệnh và JSON nhiệm vụ của nó. */
      maintenancePartId?: string;
      equipmentTaskTemplate?: EquipmentTaskTemplate | null;
    },
  ): Promise<TaskInstance> {
    const workflow = await this.workflowsService.findOne(dto.workflowId);
    // BRD 2 Rule 4: an invalid workflow (Node E without a following Node C)
    // must never be started, even though it can be saved while being designed.
    await this.workflowsService.assertExecutable(dto.workflowId);
    // Chỉ người giữ chữ S mới mở được đơn thủ công. Hai nguồn còn lại
    // (`auto_from_parent`, `work_order`) do hệ thống tự sinh, không có người
    // đề xuất nào để kiểm — chặn chúng ở đây sẽ làm gãy luồng tự động.
    if ((meta?.origin ?? 'manual') === 'manual') {
      await this.workflowsService.assertSubmittableBy(dto.workflowId, initiatorUserId);
    }
    const stepsSorted = [...(workflow.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);

    const task = await this.tasksRepository.save(
      this.tasksRepository.create({
        workflowId: workflow.id,
        workflowKind: workflow.kind,
        title: dto.title,
        referenceCode: dto.referenceCode ?? null,
        referenceTitle: dto.referenceTitle ?? null,
        status: 'Active',
        dueDate: dto.dueDate ?? null,
        initiatorUserId,
        orgUnitId: dto.orgUnitId,
        priority: dto.priority,
        taskCode: `${workflow.code}-${randomUUID().slice(0, 8).toUpperCase()}`,
        description: dto.description ?? null,
        parentTaskId: meta?.parentTaskId ?? null,
        parentMaintenanceTicketId: meta?.parentMaintenanceTicketId ?? null,
        origin: meta?.origin ?? 'manual',
        maintenancePartId: meta?.maintenancePartId ?? null,
        equipmentTaskTemplate: meta?.equipmentTaskTemplate ?? null,
      }),
    );

    // Logged before the steps are built so it is genuinely the first entry —
    // otherwise per-step escalation notes would appear above "đơn được tạo".
    const originSummary =
      meta?.origin === 'auto_from_parent'
        ? 'Tự sinh Luồng Thực thi sau khi quy trình cha được duyệt xong.'
        : meta?.origin === 'work_order'
          ? 'Tạo từ Lệnh công việc của một phiếu bảo trì.'
          : 'Tạo đơn thủ công.';
    await this.activityService.record({
      taskId: task.id,
      actorUserId: initiatorUserId,
      action: 'task.created',
      summary: `${originSummary} Quy trình ${workflow.code} — ${stepsSorted.length} bước.`,
      metadata: {
        origin: meta?.origin ?? 'manual',
        parentTaskId: meta?.parentTaskId ?? null,
        parentMaintenanceTicketId: meta?.parentMaintenanceTicketId ?? null,
      },
    });

    const orgUnitCache = new Map<string, OrgUnit>();
    const resolveOrgUnit = async (id: string): Promise<OrgUnit> => {
      let unit = orgUnitCache.get(id);
      if (!unit) {
        unit = await this.orgUnitsService.findOne(id);
        orgUnitCache.set(id, unit);
      }
      return unit;
    };

    // Who actually receives each RACI tag (incl. the empty-seat escalation) is
    // owned by OrgUnitsService so task creation and RACI validation can never
    // disagree about it.
    const resolveAssignees = (assignment: {
      orgUnitId: string;
      positionId?: string | null;
      userId?: string | null;
      roleLetter: RoleLetter;
    }) => this.orgUnitsService.resolveAssignees(assignment);

    const userNameCache = new Map<string, string>();
    const userName = async (userId: string): Promise<string> => {
      let name = userNameCache.get(userId);
      if (!name) {
        const user = await this.usersService.findById(userId);
        name = user?.fullName ?? 'Không rõ';
        userNameCache.set(userId, name);
      }
      return name;
    };

    for (let i = 0; i < stepsSorted.length; i++) {
      const templateStep = stepsSorted[i];
      const assignments = templateStep.raciAssignments ?? [];

      // Ai thực sự nhận việc — phân giải MỘT lần rồi dùng cho cả câu tóm tắt lẫn
      // các dòng `task_step_assignees`, để hai chỗ không thể nói khác nhau.
      const resolvedPerAssignment = await Promise.all(
        assignments.map((assignment) =>
          // A Work Order's Node E belongs to the person who raised it, so the
          // RACI tag is overridden rather than resolved.
          meta?.nodeEOwnerUserId && assignment.roleLetter === 'E'
            ? Promise.resolve([{ userId: meta.nodeEOwnerUserId, isEscalated: false }])
            : resolveAssignees(assignment),
        ),
      );

      // Tên người, không phải tên đơn vị: "C: Nguyễn Văn Tuấn" đọc xong là biết
      // phải hỏi ai, còn "C: Khối Kỹ thuật" thì vẫn phải tra tiếp trưởng khối là
      // ai. Đơn vị được ghi trong ngoặc để không mất ngữ cảnh gán.
      const roleAssignedSummary = (
        await Promise.all(
          assignments.map(async (a, idx) => {
            const receivers = resolvedPerAssignment[idx];
            if (receivers.length === 0) {
              const unit = await resolveOrgUnit(a.orgUnitId);
              return `${a.roleLetter}: ${unit.title} (chưa có người nhận)`;
            }
            const names = await Promise.all(
              receivers.map(async (r) =>
                r.isEscalated ? `${await userName(r.userId)} (xử lý thay)` : userName(r.userId),
              ),
            );
            // Tag gán cho cá nhân thì tên đã là tất cả; gán cho đơn vị thì kèm
            // tên đơn vị để biết chữ cái này đến từ ô nào của ma trận.
            if (a.userId) return `${a.roleLetter}: ${names.join(', ')}`;
            const unit = await resolveOrgUnit(a.orgUnitId);
            return `${a.roleLetter}: ${names.join(', ')} — ${unit.title}`;
          }),
        )
      ).join('; ');

      // BRD 3 US 3.1 — đông cứng cấu hình nguồn công việc của Node E ngay lúc
      // tạo đơn. Một bước chỉ có tối đa một tag E hữu ích ở đây; nếu có nhiều,
      // lấy tag đầu tiên có khai để không phụ thuộc thứ tự trả về của DB.
      const eAssignment = assignments.find((a) => a.roleLetter === 'E' && a.eTaskSource);

      const stepInstance = await this.stepsRepository.save(
        this.stepsRepository.create({
          taskId: task.id,
          workflowStepId: templateStep.id,
          stepOrder: templateStep.stepOrder,
          stepName: templateStep.stepName,
          roleAssignedSummary: roleAssignedSummary || null,
          status: i === 0 ? 'In Progress' : 'Pending',
          progress: 0,
          eTaskSource: eAssignment?.eTaskSource ?? null,
          eTaskList: eAssignment?.eTaskList ?? null,
        }),
      );

      const assigneeRows: TaskStepAssignee[] = [];
      const seen = new Set<string>();
      for (const [idx, assignment] of assignments.entries()) {
        for (const person of resolvedPerAssignment[idx]) {
          // (step, user, roleLetter) is the composite PK — dedupe so two tags
          // resolving to the same person for the same letter don't collide.
          const key = `${person.userId}:${assignment.roleLetter}`;
          if (seen.has(key)) continue;
          seen.add(key);
          assigneeRows.push(
            this.assigneesRepository.create({
              taskStepInstanceId: stepInstance.id,
              userId: person.userId,
              roleLetter: assignment.roleLetter,
              isEscalated: person.isEscalated,
            }),
          );
        }
      }
      if (assigneeRows.length > 0) {
        await this.assigneesRepository.save(assigneeRows);
      }

      // Escalation is a silent substitution at run time, so it has to be
      // visible in the log — otherwise nobody can explain why a step landed on
      // someone who was never named in the matrix.
      for (const row of assigneeRows.filter((r) => r.isEscalated)) {
        await this.activityService.record({
          taskId: task.id,
          stepId: stepInstance.id,
          action: 'step.escalated',
          summary: `Ghế trống ở bước "${templateStep.stepName}" — vai trò được đẩy lên cấp trên (vai trò ${row.roleLetter}).`,
          metadata: { roleLetter: row.roleLetter, userId: row.userId },
        });
      }
    }

    return this.findOne(task.id);
  }
}
