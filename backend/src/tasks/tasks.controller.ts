import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TasksService } from './tasks.service';
import { ActivityService } from '../activity/activity.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import type { TaskStatus } from './task-status';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly activityService: ActivityService,
  ) {}

  @Get()
  findAll(
    @Req() req: Request,
    @Query('status') status?: TaskStatus,
    @Query('assignedToMe') assignedToMe?: string,
  ) {
    const jwtUser = req.user as JwtPayload;
    return this.tasksService.findAll({ status, assignedToMe: assignedToMe === 'true' }, jwtUser.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  /** Full operation log for one task (created → approvals → sub-tasks → …). */
  @Get(':id/activity')
  findActivity(@Param('id', ParseUUIDPipe) id: string) {
    return this.activityService.findForTask(id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateTaskDto) {
    const jwtUser = req.user as JwtPayload;
    return this.tasksService.create(dto, jwtUser.sub);
  }
}
