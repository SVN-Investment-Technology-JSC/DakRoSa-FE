import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { TaskStepAssignee } from '../../tasks/task-step-assignee.entity';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import type { RoleLetter } from '../../raci/role-letter';

export interface RaciActionRequest extends Request {
  raciLetters?: RoleLetter[];
}

/**
 * Confirms the JWT user is an assigned RACI participant on the target task
 * step and attaches the letters they hold as `req.raciLetters`. Runs
 * alongside (not instead of) PermissionsGuard('task.approve') — both must
 * pass for an approve/reject action to proceed.
 */
@Injectable()
export class RaciActionGuard implements CanActivate {
  constructor(
    @InjectRepository(TaskStepAssignee)
    private readonly assigneesRepository: Repository<TaskStepAssignee>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RaciActionRequest>();
    const jwtUser = request.user as JwtPayload | undefined;
    if (!jwtUser) {
      throw new ForbiddenException('Not authenticated');
    }

    const stepId = String(request.params.stepId);
    const rows = await this.assigneesRepository.find({
      where: { taskStepInstanceId: stepId, userId: jwtUser.sub },
    });
    if (rows.length === 0) {
      throw new ForbiddenException('You are not an assigned RACI participant on this step');
    }

    request.raciLetters = rows.map((r) => r.roleLetter);
    return true;
  }
}
