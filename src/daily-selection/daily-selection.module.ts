import { Module } from '@nestjs/common';
import { DailySelectionService } from './daily-selection.service';
import { DailySelectionController } from './daily-selection.controller';

@Module({
  controllers: [DailySelectionController],
  providers: [DailySelectionService],
})
export class DailySelectionModule {}
