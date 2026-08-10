import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrgUnitsService } from './org-units.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { CreateOrgUnitMemberDto } from './dto/create-org-unit-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('org-units')
export class OrgUnitsController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  @Get('tree')
  findTree() {
    return this.orgUnitsService.findTree();
  }

  @Get(':id/descendants')
  findDescendants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('minLevel') minLevel?: string,
    @Query('maxLevel') maxLevel?: string,
  ) {
    return this.orgUnitsService.findDescendants(
      id,
      minLevel !== undefined ? Number(minLevel) : undefined,
      maxLevel !== undefined ? Number(maxLevel) : undefined,
    );
  }

  @Get()
  findByLevel(@Query('level', ParseIntPipe) level: number) {
    return this.orgUnitsService.findByLevel(level);
  }

  // Personnel routes must be declared before the bare ':id' catch-all.
  @Get(':id/members')
  findMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgUnitsService.findMembers(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('org.manage')
  @Post('members')
  addMember(@Body() dto: CreateOrgUnitMemberDto) {
    return this.orgUnitsService.addMember(dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('org.manage')
  @Delete('members/:memberId')
  removeMember(@Param('memberId', ParseUUIDPipe) memberId: string) {
    return this.orgUnitsService.removeMember(memberId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgUnitsService.findOne(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('org.manage')
  @Post()
  create(@Body() dto: CreateOrgUnitDto) {
    return this.orgUnitsService.create(dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('org.manage')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrgUnitDto) {
    return this.orgUnitsService.update(id, dto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('org.manage')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgUnitsService.remove(id);
  }
}
