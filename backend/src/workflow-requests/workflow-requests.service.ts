import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowRequest } from './workflow-request.entity';
import { CreateWorkflowRequestDto } from './dto/create-workflow-request.dto';
import { TriageWorkflowRequestDto } from './dto/triage-workflow-request.dto';
import { TasksService } from '../tasks/tasks.service';
import type { WorkflowRequestStatus } from './workflow-request-status';

const PRIORITY_TO_TASK_PRIORITY = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
} as const;

@Injectable()
export class WorkflowRequestsService {
  constructor(
    @InjectRepository(WorkflowRequest)
    private readonly requestsRepository: Repository<WorkflowRequest>,
    private readonly tasksService: TasksService,
  ) {}

  findAll(status?: WorkflowRequestStatus): Promise<WorkflowRequest[]> {
    return this.requestsRepository.find({
      where: status ? { status } : {},
      relations: ['submittedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<WorkflowRequest> {
    const request = await this.requestsRepository.findOne({
      where: { id },
      relations: ['submittedBy', 'resultingTask'],
    });
    if (!request) {
      throw new NotFoundException(`Workflow request ${id} not found`);
    }
    return request;
  }

  create(dto: CreateWorkflowRequestDto, submittedByUserId: string): Promise<WorkflowRequest> {
    const request = this.requestsRepository.create({
      workflowKind: dto.workflowKind,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      attachedFileName: dto.attachedFileName ?? null,
      submittedByUserId,
      status: 'Initiated',
    });
    return this.requestsRepository.save(request);
  }

  async triage(id: string, dto: TriageWorkflowRequestDto): Promise<WorkflowRequest> {
    const request = await this.findOne(id);
    if (request.status !== 'Initiated') {
      throw new BadRequestException(
        `Workflow request ${id} has already been triaged (status: ${request.status})`,
      );
    }

    // The resulting task's initiator is the original submitter, not the triager.
    const task = await this.tasksService.create(
      {
        workflowId: dto.workflowId,
        title: request.title,
        orgUnitId: dto.orgUnitId,
        priority: PRIORITY_TO_TASK_PRIORITY[request.priority],
        description: request.description,
      },
      request.submittedByUserId,
    );

    // Use a targeted update rather than save(request): the loaded `request`
    // still carries its stale (null) `resultingTask` relation object, which
    // TypeORM's save() would use to compute the FK and silently null it back out.
    await this.requestsRepository.update(id, {
      status: 'In Progress',
      resultingTaskId: task.id,
    });
    return this.findOne(id);
  }
}
