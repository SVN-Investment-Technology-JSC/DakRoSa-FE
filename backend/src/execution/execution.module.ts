import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionSubtask } from './execution-subtask.entity';
import { ExecutionAttachment } from './execution-attachment.entity';
import { TaskStepInstance } from '../tasks/task-step-instance.entity';
import { TaskStepAssignee } from '../tasks/task-step-assignee.entity';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { OrgUnitsModule } from '../org-units/org-units.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExecutionSubtask,
      ExecutionAttachment,
      TaskStepInstance,
      TaskStepAssignee,
    ]),
    AuthModule,
    UsersModule,
    TasksModule,
    OrgUnitsModule,
  ],
  controllers: [ExecutionController],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
