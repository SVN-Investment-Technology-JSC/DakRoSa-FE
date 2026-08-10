import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskInstance } from './task-instance.entity';
import { TaskStepInstance } from './task-step-instance.entity';
import { TaskStepAssignee } from './task-step-assignee.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { OrgUnitsModule } from '../org-units/org-units.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskInstance, TaskStepInstance, TaskStepAssignee]),
    AuthModule,
    UsersModule,
    WorkflowsModule,
    OrgUnitsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
