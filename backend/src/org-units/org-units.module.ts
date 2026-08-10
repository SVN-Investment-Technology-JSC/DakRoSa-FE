import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgUnit } from './org-unit.entity';
import { OrgUnitClosure } from './org-unit-closure.entity';
import { OrgUnitType } from './org-unit-type.entity';
import { OrgUnitMember } from './org-unit-member.entity';
import { OrgUnitsService } from './org-units.service';
import { OrgUnitsController } from './org-units.controller';
import { OrgUnitTypesController } from './org-unit-types.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgUnit, OrgUnitClosure, OrgUnitType, OrgUnitMember]),
    AuthModule,
    UsersModule,
  ],
  controllers: [OrgUnitsController, OrgUnitTypesController],
  providers: [OrgUnitsService],
  exports: [OrgUnitsService],
})
export class OrgUnitsModule {}
