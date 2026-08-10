import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto';
import { UpdateWorkflowStepDto } from './dto/update-workflow-step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { WorkflowKind } from './workflow-kind';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  findAll(@Query('kind') kind?: WorkflowKind) {
    return this.workflowsService.findAll(kind);
  }

  // Declared before the bare ':id' route so it is not swallowed by it.
  @Get(':id/validation')
  validate(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowsService.validate(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowsService.findOne(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Post(':id/steps')
  addStep(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateWorkflowStepDto) {
    return this.workflowsService.addStep(id, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Patch(':id/steps/:stepId')
  updateStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: UpdateWorkflowStepDto,
  ) {
    return this.workflowsService.updateStep(id, stepId, dto);
  }
}
