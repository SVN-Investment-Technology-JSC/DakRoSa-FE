import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import typeormConfig, { typeOrmDataSourceOptions } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';
import { OrgUnitsModule } from './org-units/org-units.module';
import { PositionsModule } from './positions/positions.module';
import { ExecutionModule } from './execution/execution.module';
import { StorageModule } from './storage/storage.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { RaciModule } from './raci/raci.module';
import { TasksModule } from './tasks/tasks.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { WorkflowRequestsModule } from './workflow-requests/workflow-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivityModule } from './activity/activity.module';
import { MaintenanceModule } from './maintenance/maintenance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeormConfig],
    }),
    TypeOrmModule.forRoot(typeOrmDataSourceOptions),
    ScheduleModule.forRoot(),
    ActivityModule,
    AuthModule,
    UsersModule,
    RbacModule,
    OrgUnitsModule,
    PositionsModule,
    StorageModule,
    ExecutionModule,
    WorkflowsModule,
    RaciModule,
    TasksModule,
    ApprovalsModule,
    WorkflowRequestsModule,
    NotificationsModule,
    MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
