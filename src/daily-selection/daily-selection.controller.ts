import { Controller, Get, Query } from '@nestjs/common';
import { DailySelectionService } from './daily-selection.service';

@Controller('daily-selection')
export class DailySelectionController {
  constructor(private readonly svc: DailySelectionService) {}

  @Get()
  findToday(@Query('modeId') modeId?: string) {
    return this.svc.getTodaySelection(modeId ? parseInt(modeId) : undefined);
  }
}
