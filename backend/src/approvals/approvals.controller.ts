import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApprovalsService } from './approvals.service';
import { ApproveStepDto } from './dto/approve-step.dto';
import { RejectStepDto } from './dto/reject-step.dto';
import { DelegateStepDto } from './dto/delegate-step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RaciActionGuard, RaciActionRequest } from './guards/raci-action.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get(':taskId/steps/:stepId/valid-rollback-targets')
  getValidRollbackTargets(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    return this.approvalsService.getValidRollbackTargets(taskId, stepId);
  }

  @UseGuards(PermissionsGuard, RaciActionGuard)
  @RequirePermissions('task.approve')
  @Post(':taskId/steps/:stepId/approve')
  approve(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: ApproveStepDto,
  ) {
    const jwtUser = req.user as JwtPayload;
    const raciLetters = (req as RaciActionRequest).raciLetters!;
    return this.approvalsService.approveStep(taskId, stepId, jwtUser.sub, raciLetters, dto);
  }

  @UseGuards(PermissionsGuard, RaciActionGuard)
  @RequirePermissions('task.approve')
  @Post(':taskId/steps/:stepId/reject')
  reject(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: RejectStepDto,
  ) {
    const jwtUser = req.user as JwtPayload;
    const raciLetters = (req as RaciActionRequest).raciLetters!;
    return this.approvalsService.rejectStep(taskId, stepId, jwtUser.sub, raciLetters, dto);
  }

  @UseGuards(PermissionsGuard, RaciActionGuard)
  @RequirePermissions('task.approve')
  @Get(':taskId/steps/:stepId/delegation-candidates')
  getDelegationCandidates(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    const jwtUser = req.user as JwtPayload;
    return this.approvalsService.getDelegationCandidates(taskId, stepId, jwtUser.sub);
  }

  @UseGuards(PermissionsGuard, RaciActionGuard)
  @RequirePermissions('task.approve')
  @Post(':taskId/steps/:stepId/delegate')
  delegate(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: DelegateStepDto,
  ) {
    const jwtUser = req.user as JwtPayload;
    const raciLetters = (req as RaciActionRequest).raciLetters!;
    return this.approvalsService.delegateStep(taskId, stepId, jwtUser.sub, raciLetters, dto);
  }
}
