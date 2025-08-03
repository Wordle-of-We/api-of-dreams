import { Module } from '@nestjs/common';
import { DailySelectionService } from './daily-selection.service';
import { DailySelectionController } from './daily-selection.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [DailySelectionService, PrismaService],
  controllers: [DailySelectionController],
})
export class DailySelectionModule {}
