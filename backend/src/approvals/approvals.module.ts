import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalAction } from './approval-action.entity';
import { TaskStepInstance } from '../tasks/task-step-instance.entity';
import { TaskStepAssignee } from '../tasks/task-step-assignee.entity';
import { RaciAssignment } from '../raci/raci-assignment.entity';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { RaciActionGuard } from './guards/raci-action.guard';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { OrgUnitsModule } from '../org-units/org-units.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalAction, TaskStepInstance, TaskStepAssignee, RaciAssignment]),
    AuthModule,
    UsersModule,
    TasksModule,
    OrgUnitsModule,
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, RaciActionGuard],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
