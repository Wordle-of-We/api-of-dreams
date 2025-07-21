import { Controller, Get, Query, Post } from '@nestjs/common';
import { DailySelectionService } from './daily-selection.service';
import { GameMode } from '@prisma/client';

@Controller('daily-selection')
export class DailySelectionController {
  constructor(private readonly svc: DailySelectionService) {}

  @Post('generate')
  async generateNow() {
    return this.svc.handleDailyDraw();
  }

  @Get()
  findToday(@Query('mode') mode?: GameMode) {
    return this.svc.getTodaySelection(mode);
  }
}
