import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workflow } from './workflow.entity';
import { WorkflowStep } from './workflow-step.entity';
import { RaciAssignment } from '../raci/raci-assignment.entity';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { OrgUnitsModule } from '../org-units/org-units.module';

@Module({
  imports: [
    // `RaciAssignment` is registered here for its repository only — RaciModule
    // already depends on WorkflowsModule, so importing it back would cycle.
    TypeOrmModule.forFeature([Workflow, WorkflowStep, RaciAssignment]),
    AuthModule,
    UsersModule,
    OrgUnitsModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
