import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WorkflowRequestsService } from './workflow-requests.service';
import { CreateWorkflowRequestDto } from './dto/create-workflow-request.dto';
import { TriageWorkflowRequestDto } from './dto/triage-workflow-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import type { WorkflowRequestStatus } from './workflow-request-status';

@UseGuards(JwtAuthGuard)
@Controller('workflow-requests')
export class WorkflowRequestsController {
  constructor(private readonly workflowRequestsService: WorkflowRequestsService) {}

  @Get()
  findAll(@Query('status') status?: WorkflowRequestStatus) {
    return this.workflowRequestsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowRequestsService.findOne(id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateWorkflowRequestDto) {
    const jwtUser = req.user as JwtPayload;
    return this.workflowRequestsService.create(dto, jwtUser.sub);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Post(':id/triage')
  triage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TriageWorkflowRequestDto) {
    return this.workflowRequestsService.triage(id, dto);
  }
}
