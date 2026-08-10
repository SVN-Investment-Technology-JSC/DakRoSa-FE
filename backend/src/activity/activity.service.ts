import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TaskActivityLog } from './activity-log.entity';

export interface LogInput {
  taskId: string;
  stepId?: string | null;
  actorUserId?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(TaskActivityLog)
    private readonly logsRepository: Repository<TaskActivityLog>,
  ) {}

  /**
   * Records one event. Pass `manager` to enlist it in the caller's transaction
   * so the log and the change it describes commit together.
   *
   * Never throws: an audit trail must not be able to fail the business action
   * it is describing. A lost line is logged loudly instead.
   */
  async record(input: LogInput, manager?: EntityManager): Promise<void> {
    try {
      const repo = manager ? manager.getRepository(TaskActivityLog) : this.logsRepository;
      await repo.save(repo.create(input));
    } catch (error) {
      this.logger.error(
        `Không ghi được nhật ký "${input.action}" cho đơn ${input.taskId}`,
        error as Error,
      );
    }
  }

  findForTask(taskId: string): Promise<TaskActivityLog[]> {
    return this.logsRepository.find({
      where: { taskId },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });
  }
}
