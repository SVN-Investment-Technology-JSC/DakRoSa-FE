import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ExecutionService } from './execution.service';
import { ReplaceSubtasksDto } from './dto/replace-subtasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/steps/:stepId/subtasks')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get()
  findAll(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    return this.executionService.findSubtasks(taskId, stepId);
  }

  @Get('candidates')
  findCandidates(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    const user = req.user as JwtPayload;
    return this.executionService.findBreakdownCandidates(taskId, stepId, user.sub);
  }

  @Put()
  replace(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: ReplaceSubtasksDto,
  ) {
    const user = req.user as JwtPayload;
    return this.executionService.replaceSubtasks(taskId, stepId, user.sub, dto);
  }

  @Post(':subtaskId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  uploadAttachment(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Chưa chọn file để tải lên.');
    const user = req.user as JwtPayload;
    return this.executionService.addAttachment(taskId, stepId, subtaskId, user.sub, file);
  }

  @Get(':subtaskId/attachments/:attachmentId/url')
  getAttachmentUrl(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.executionService.getAttachmentUrl(taskId, stepId, subtaskId, attachmentId);
  }

  @Post(':subtaskId/submit')
  submit(
    @Req() req: Request,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Param('subtaskId', ParseUUIDPipe) subtaskId: string,
    @Body() body: { note?: string },
  ) {
    const user = req.user as JwtPayload;
    return this.executionService.submitSubtask(taskId, stepId, subtaskId, user.sub, body?.note);
  }
}
