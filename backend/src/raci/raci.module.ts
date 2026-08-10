import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaciAssignment } from './raci-assignment.entity';
import { RoleLetterAllowlist } from './role-letter-allowlist.entity';
import { RaciService } from './raci.service';
import { RaciController } from './raci.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { OrgUnitsModule } from '../org-units/org-units.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaciAssignment, RoleLetterAllowlist]),
    AuthModule,
    UsersModule,
    WorkflowsModule,
    OrgUnitsModule,
  ],
  controllers: [RaciController],
  providers: [RaciService],
  exports: [RaciService],
})
export class RaciModule {}
