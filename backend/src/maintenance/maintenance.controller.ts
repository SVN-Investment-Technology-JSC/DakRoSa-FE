import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { MaintenanceService } from './maintenance.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { SetSchedulesDto } from './dto/set-schedules.dto';
import { SetTaskTemplateDto } from './dto/set-task-template.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // ---------------------------------------------------------------- Parts

  @Get('maintenance-parts')
  findParts() {
    return this.maintenanceService.findParts();
  }

  /** BRD 3 Epic 1 — cây cấu trúc tài sản cho màn hình "Sơ đồ thiết bị". */
  @Get('maintenance-parts/tree')
  findPartsTree() {
    return this.maintenanceService.findPartsTree();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Post('maintenance-parts')
  createPart(@Body() dto: CreatePartDto) {
    return this.maintenanceService.createPart(dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Patch('maintenance-parts/:id')
  updatePart(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePartDto) {
    return this.maintenanceService.updatePart(id, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Delete('maintenance-parts/:id')
  deletePart(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.deletePart(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Put('maintenance-parts/:id/schedules')
  setSchedules(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetSchedulesDto) {
    return this.maintenanceService.setSchedules(id, dto);
  }

  /** BRD 3 US 2.1 AC2 — "Thêm thông tin công việc" ở Ma trận bảo trì. */
  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Put('maintenance-parts/:id/task-template')
  setTaskTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetTaskTemplateDto) {
    return this.maintenanceService.setTaskTemplate(id, dto);
  }

  // -------------------------------------------------------------- Tickets

  @Get('maintenance-tickets')
  findTickets(@Query('open') open?: string) {
    return this.maintenanceService.findTickets(open === 'true');
  }

  @Get('maintenance-tickets/:id')
  findTicket(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.findTicket(id);
  }

  @Patch('maintenance-tickets/:id')
  updateTicket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto) {
    return this.maintenanceService.updateTicket(id, dto);
  }

  @Post('maintenance-tickets/:id/work-order')
  createWorkOrder(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = req.user as JwtPayload;
    return this.maintenanceService.createWorkOrder(id, user.sub);
  }

  /**
   * Manual trigger for the daily sweep — lets an admin catch up after downtime
   * without waiting for midnight. Idempotent, same as the cron path.
   */
  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Post('maintenance/run-sweep')
  runSweep(@Body() body: { today?: string }) {
    return this.maintenanceService.runReminderSweep(body?.today);
  }
}
