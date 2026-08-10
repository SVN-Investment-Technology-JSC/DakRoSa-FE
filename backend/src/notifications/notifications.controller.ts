import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@Req() req: Request, @Query('unread') unread?: string) {
    const user = req.user as JwtPayload;
    return this.notificationsService.findForUser(user.sub, unread === 'true');
  }

  @Get('unread-count')
  async unreadCount(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return { count: await this.notificationsService.countUnread(user.sub) };
  }

  @Patch(':id/read')
  markRead(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as JwtPayload;
    return this.notificationsService.markRead(id, user.sub);
  }

  @Patch('read-all')
  markAllRead(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.notificationsService.markAllRead(user.sub);
  }
}
