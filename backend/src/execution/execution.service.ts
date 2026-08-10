import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ExecutionSubtask } from './execution-subtask.entity';
import { ExecutionAttachment } from './execution-attachment.entity';
import { TaskStepInstance } from '../tasks/task-step-instance.entity';
import { TaskStepAssignee } from '../tasks/task-step-assignee.entity';
import { TasksService } from '../tasks/tasks.service';
import { OrgUnitsService } from '../org-units/org-units.service';
import { ActivityService } from '../activity/activity.service';
import { StorageService } from '../storage/storage.service';
import { completeStepAndAdvance } from '../tasks/step-progression';
import { isActionableStepStatus } from '../tasks/task-status';
import { ReplaceSubtasksDto } from './dto/replace-subtasks.dto';
import { distributeWeights, isTotalExact, sumWeights } from './weights';
import { DEFAULT_E_TASK_SOURCE } from '../raci/e-task-source';
import type { ETaskSource } from '../raci/e-task-source';
import { isNonEmptyTemplate } from '../maintenance/asset';
import type { EquipmentTaskTemplate } from '../maintenance/asset';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    @InjectRepository(ExecutionSubtask)
    private readonly subtasksRepository: Repository<ExecutionSubtask>,
    @InjectRepository(ExecutionAttachment)
    private readonly attachmentsRepository: Repository<ExecutionAttachment>,
    @InjectRepository(TaskStepInstance)
    private readonly stepsRepository: Repository<TaskStepInstance>,
    @InjectRepository(TaskStepAssignee)
    private readonly assigneesRepository: Repository<TaskStepAssignee>,
    private readonly tasksService: TasksService,
    private readonly orgUnitsService: OrgUnitsService,
    private readonly storage: StorageService,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  async findSubtasks(taskId: string, stepId: string): Promise<ExecutionSubtask[]> {
    await this.findStepOrThrow(taskId, stepId);
    return this.subtasksRepository.find({
      where: { taskStepInstanceId: stepId },
      relations: ['assignee', 'attachments'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Who the Node E owner may hand an `E(x)` to — the same subordinate list
   * delegation uses (`OrgUnitsService.findSubordinates`): the owner's own team
   * plus everyone below it.
   */
  async findBreakdownCandidates(taskId: string, stepId: string, callerUserId: string) {
    await this.findStepOrThrow(taskId, stepId);
    await this.assertNodeEOwner(stepId, callerUserId);
    return this.orgUnitsService.findSubordinates(callerUserId);
  }

  /**
   * BRD 3 US 3.1 AC3 — các đầu việc mà bước E này phải giao, theo đúng nguồn đã
   * chốt lúc thiết kế luồng.
   *
   * Chỉ TRẢ VỀ gợi ý, không tự tạo `E(x)`: mỗi đầu việc còn phải gắn với một
   * người cụ thể, mà chuyện đó chỉ người giữ Node E mới quyết được. Phân rã vẫn
   * đi qua đúng một cửa là `replaceSubtasks`.
   */
  async getSuggestedTasks(
    taskId: string,
    stepId: string,
  ): Promise<{
    source: ETaskSource;
    tasks: EquipmentTaskTemplate;
    deviceName?: string | null;
    unavailableReason?: string;
  }> {
    const step = await this.findStepOrThrow(taskId, stepId);
    const source = step.eTaskSource ?? DEFAULT_E_TASK_SOURCE;

    if (source === 'task_list') {
      return { source, tasks: step.eTaskList ?? [] };
    }

    if (source === 'device_default') {
      const task = await this.tasksService.findOne(taskId);
      const template = task.equipmentTaskTemplate;
      if (!isNonEmptyTemplate(template)) {
        // Cấu hình từng hợp lệ lúc thiết kế (có thiết bị khác đã khai JSON)
        // nhưng Lệnh cụ thể này lại rơi vào thiết bị chưa khai. Nói rõ ra thay
        // vì trả mảng rỗng, để người giữ E biết là phải nhập tay chứ không
        // tưởng hệ thống hỏng.
        return {
          source,
          tasks: [],
          unavailableReason:
            'Lệnh công việc này không mang theo danh sách nhiệm vụ của thiết bị. Hãy phân rã thủ công, hoặc khai Danh sách nhiệm vụ cho thiết bị ở Ma trận bảo trì rồi tạo lại Lệnh.',
        };
      }
      return { source, tasks: template, deviceName: task.title };
    }

    return { source, tasks: [] };
  }

  /**
   * Replaces the whole E(x) breakdown for a Node E step (BRD 2 US 1.3).
   * Only the Node E owner may do this.
   */
  async replaceSubtasks(
    taskId: string,
    stepId: string,
    callerUserId: string,
    dto: ReplaceSubtasksDto,
  ) {
    const step = await this.findStepOrThrow(taskId, stepId);
    await this.assertNodeEOwner(stepId, callerUserId);

    if (!isActionableStepStatus(step.status)) {
      throw new BadRequestException('Bước này hiện không ở trạng thái xử lý được.');
    }

    const rows = dto.subtasks;
    if (rows.length === 0) {
      await this.subtasksRepository.delete({ taskStepInstanceId: stepId });
      await this.stepsRepository.update(stepId, { progress: 0 });
      return this.findSubtasks(taskId, stepId);
    }

    // Equal split unless every row carries an explicit weight.
    const allWeighted = rows.every((r) => typeof r.weight === 'number');
    const weights = allWeighted
      ? rows.map((r) => r.weight as number)
      : distributeWeights(rows.length);

    if (!isTotalExact(weights)) {
      throw new BadRequestException(
        `Tổng trọng số các công việc con phải bằng đúng 100%. Hiện tại: ${sumWeights(weights)}%.`,
      );
    }

    const duplicate = rows.find(
      (r, i) => rows.findIndex((o) => o.assigneeUserId === r.assigneeUserId && o.title === r.title) !== i,
    );
    if (duplicate) {
      throw new BadRequestException(
        `Trùng công việc con: "${duplicate.title}" đã được giao cho cùng một người.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Replace wholesale — same semantics as the RACI cell editor, so the
      // client always sends the full intended list.
      await manager.delete(ExecutionSubtask, { taskStepInstanceId: stepId });
      await manager.save(
        ExecutionSubtask,
        rows.map((row, i) => ({
          taskStepInstanceId: stepId,
          assigneeUserId: row.assigneeUserId,
          title: row.title,
          weight: weights[i],
          status: 'Pending' as const,
        })),
      );
      // Nothing is submitted yet, so the parent Node E restarts at 0%.
      await manager.update(TaskStepInstance, stepId, { progress: 0 });

      await this.activityService.record(
        {
          taskId,
          stepId,
          actorUserId: callerUserId,
          action: 'subtasks.replaced',
          summary: `Phân rã bước "${step.stepName}" thành ${rows.length} công việc con (${rows
            .map((r, i) => `${r.title} ${weights[i]}%`)
            .join('; ')}).`,
          metadata: { count: rows.length, weights },
        },
        manager,
      );
    });

    return this.findSubtasks(taskId, stepId);
  }

  async addAttachment(
    taskId: string,
    stepId: string,
    subtaskId: string,
    callerUserId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<ExecutionAttachment> {
    const subtask = await this.findSubtaskOrThrow(taskId, stepId, subtaskId);
    if (subtask.assigneeUserId !== callerUserId) {
      throw new ForbiddenException('Chỉ người được giao công việc con này mới được nộp file.');
    }

    const { objectKey } = await this.storage.upload(file);
    await this.activityService.record({
      taskId,
      stepId,
      actorUserId: callerUserId,
      action: 'subtask.attachment_added',
      summary: `Đính kèm "${file.originalname}" vào công việc con "${subtask.title}".`,
      metadata: { subtaskId, fileName: file.originalname, sizeBytes: file.size },
    });
    return this.attachmentsRepository.save(
      this.attachmentsRepository.create({
        subtaskId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        objectKey,
        uploadedByUserId: callerUserId,
      }),
    );
  }

  async getAttachmentUrl(
    taskId: string,
    stepId: string,
    subtaskId: string,
    attachmentId: string,
  ): Promise<{ url: string }> {
    await this.findSubtaskOrThrow(taskId, stepId, subtaskId);
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId, subtaskId },
    });
    if (!attachment) throw new NotFoundException('Không tìm thấy file đính kèm.');
    return { url: await this.storage.getDownloadUrl(attachment.objectKey) };
  }

  /**
   * Submits one E(x) (BRD 2 US 1.4). An attachment is mandatory, and the parent
   * Node E's progress is recomputed from the weights of everything submitted.
   */
  async submitSubtask(taskId: string, stepId: string, subtaskId: string, callerUserId: string, note?: string) {
    const step = await this.findStepOrThrow(taskId, stepId);
    const subtask = await this.findSubtaskOrThrow(taskId, stepId, subtaskId);

    if (subtask.assigneeUserId !== callerUserId) {
      throw new ForbiddenException('Chỉ người được giao công việc con này mới được nộp kết quả.');
    }
    if (subtask.status === 'Submitted') {
      throw new BadRequestException('Công việc con này đã được nộp rồi.');
    }

    const attachmentCount = await this.attachmentsRepository.count({ where: { subtaskId } });
    if (attachmentCount === 0) {
      throw new BadRequestException('Vui lòng đính kèm file báo cáo kết quả');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(ExecutionSubtask, subtaskId, {
        status: 'Submitted',
        submittedAt: new Date(),
        note: note ?? null,
      });

      const all = await manager.find(ExecutionSubtask, { where: { taskStepInstanceId: stepId } });
      const done = all.filter((s) => s.status === 'Submitted' || s.id === subtaskId);
      const progress = sumWeights(done.map((s) => Number(s.weight)));

      if (progress >= 100) {
        // Every E(x) is in — the Node E is finished, hand over to the Node C.
        await completeStepAndAdvance(manager, taskId, step);
      } else {
        await manager.update(TaskStepInstance, stepId, { progress: Math.round(progress) });
      }

      await this.activityService.record(
        {
          taskId,
          stepId,
          actorUserId: callerUserId,
          action: 'subtask.submitted',
          summary:
            `Nộp kết quả công việc con "${subtask.title}" (${subtask.weight}%). ` +
            `Tiến độ bước "${step.stepName}": ${Math.min(100, Math.round(progress))}%.` +
            (note ? ` Ghi chú: ${note}` : ''),
          metadata: { subtaskId, weight: subtask.weight, progress },
        },
        manager,
      );
    });

    // A submission can be what completes the step, so the same post-commit
    // sub-flow spawn that approvals do has to happen here too — otherwise a
    // link on an execution step would only ever fire for approved steps.
    try {
      await this.tasksService.spawnSubFlowsForCompletedSteps(taskId);
    } catch (error) {
      this.logger.error(
        `Nộp kết quả ở đơn ${taskId} thành công nhưng không mở được luồng con; có thể chạy lại sau.`,
        error as Error,
      );
    }

    return this.tasksService.findOne(taskId);
  }

  private async findStepOrThrow(taskId: string, stepId: string): Promise<TaskStepInstance> {
    const step = await this.stepsRepository.findOne({ where: { id: stepId, taskId } });
    if (!step) throw new NotFoundException(`Không tìm thấy bước ${stepId} trong đơn ${taskId}`);
    return step;
  }

  private async findSubtaskOrThrow(taskId: string, stepId: string, subtaskId: string) {
    await this.findStepOrThrow(taskId, stepId);
    const subtask = await this.subtasksRepository.findOne({
      where: { id: subtaskId, taskStepInstanceId: stepId },
    });
    if (!subtask) throw new NotFoundException('Không tìm thấy công việc con.');
    return subtask;
  }

  private async assertNodeEOwner(stepId: string, userId: string): Promise<void> {
    const owns = await this.assigneesRepository.count({
      where: { taskStepInstanceId: stepId, userId, roleLetter: 'E' },
    });
    if (owns === 0) {
      throw new ForbiddenException('Chỉ người giữ Node E của bước này mới được phân rã công việc.');
    }
  }
}
