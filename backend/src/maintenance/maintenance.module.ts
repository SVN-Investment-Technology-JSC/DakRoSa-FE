import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenancePart } from './maintenance-part.entity';
import { MaintenanceSchedule } from './maintenance-schedule.entity';
import { MaintenanceTicket } from './maintenance-ticket.entity';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceSchedulerService } from './maintenance-scheduler.service';
import { MaintenanceController } from './maintenance.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrgUnitsModule } from '../org-units/org-units.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenancePart, MaintenanceSchedule, MaintenanceTicket]),
    AuthModule,
    UsersModule,
    OrgUnitsModule,
    NotificationsModule,
    TasksModule,
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceSchedulerService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
