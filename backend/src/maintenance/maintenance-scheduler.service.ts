import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MaintenanceService } from './maintenance.service';

/**
 * The only job of this class is to decide *when* the sweep runs. All the
 * actual logic lives in `MaintenanceService.runReminderSweep`, which takes the
 * date as an argument — that is what makes the behaviour unit-testable without
 * a scheduler or a frozen clock.
 */
@Injectable()
export class MaintenanceSchedulerService {
  private readonly logger = new Logger(MaintenanceSchedulerService.name);

  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Cron('0 0 * * *', { name: 'maintenance-reminder-sweep', timeZone: 'Asia/Ho_Chi_Minh' })
  async handleDailySweep(): Promise<void> {
    try {
      await this.maintenanceService.runReminderSweep();
    } catch (error) {
      // Never let a bad sweep take the process down — tomorrow's run recovers,
      // because due dates are re-derived from the anchor rather than advanced
      // blindly.
      this.logger.error('Quét bảo trì hằng ngày thất bại', error as Error);
    }
  }
}
