import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { RaciService } from './raci.service';
import { UpsertRaciCellDto } from './dto/upsert-raci-cell.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class RaciController {
  constructor(private readonly raciService: RaciService) {}

  @Get(':id/role-letter-options')
  getRoleLetterOptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.raciService.getRoleLetterOptions(id);
  }

  /** BRD 3 US 3.1 AC2/AC3 — dropdown nguồn công việc của Role E. */
  @Get(':id/e-task-source-options')
  getETaskSourceOptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.raciService.getETaskSourceOptions(id);
  }

  @Get(':id/steps/:stepId/valid-rollback-targets')
  getValidRollbackTargets(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    return this.raciService.getValidRollbackTargets(id, stepId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('workflow.design')
  @Put(':id/steps/:stepId/raci')
  replaceCellAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: UpsertRaciCellDto,
  ) {
    return this.raciService.replaceCellAssignments(id, stepId, dto);
  }
}
