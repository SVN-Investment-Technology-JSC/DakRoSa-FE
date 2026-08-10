import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OrgUnitsService } from './org-units.service';
import { CreateOrgUnitTypeDto } from './dto/create-org-unit-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('org-unit-types')
export class OrgUnitTypesController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  @Get()
  findAll() {
    return this.orgUnitsService.findAllTypes();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('org.manage')
  @Post()
  create(@Body() dto: CreateOrgUnitTypeDto) {
    return this.orgUnitsService.createType(dto);
  }
}
