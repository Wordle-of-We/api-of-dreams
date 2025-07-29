import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StatsService } from './stats.service';
import { StatsSnapshotService } from './stats-snapshot.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
  ],
  providers: [StatsService, StatsSnapshotService],
  controllers: [StatsController],
  exports: [StatsService, StatsSnapshotService],
})
export class StatsModule { }
