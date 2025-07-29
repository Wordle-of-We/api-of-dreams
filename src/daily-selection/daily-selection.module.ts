import { Module } from '@nestjs/common';
import { DailySelectionService } from './daily-selection.service';
import { DailySelectionController } from './daily-selection.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [DailySelectionService],
  controllers: [DailySelectionController],
})
export class DailySelectionModule {}
