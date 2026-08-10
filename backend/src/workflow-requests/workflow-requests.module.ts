import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowRequest } from './workflow-request.entity';
import { WorkflowRequestsService } from './workflow-requests.service';
import { WorkflowRequestsController } from './workflow-requests.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowRequest]), AuthModule, UsersModule, TasksModule],
  controllers: [WorkflowRequestsController],
  providers: [WorkflowRequestsService],
  exports: [WorkflowRequestsService],
})
export class WorkflowRequestsModule {}
