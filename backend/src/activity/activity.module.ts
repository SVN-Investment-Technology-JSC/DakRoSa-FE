import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskActivityLog } from './activity-log.entity';
import { ActivityService } from './activity.service';

/**
 * Global: almost every module writes to the log, and threading an import
 * through each of them adds nothing but noise.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([TaskActivityLog])],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
