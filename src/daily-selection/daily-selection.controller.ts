import { Body, Controller, Get, InternalServerErrorException, Post, Query } from '@nestjs/common';
import { DailySelectionService } from './daily-selection.service';

@Controller('daily-selection')
export class DailySelectionController {
  dailySelectionService: any;
  constructor(private readonly svc: DailySelectionService) { }

  @Get()
  findToday(@Query('modeId') modeId?: string) {
    return this.svc.getTodaySelection(modeId ? parseInt(modeId) : undefined);
  }

  @Post()
  async createDailySelection(@Body() dto: { characterId: number; modeConfigId: number }) {
    try {
      return await this.dailySelectionService.createManualSelection(dto);
    } catch (error) {
      console.error('[DailySelection] Erro ao criar manualmente:', error);
      throw new InternalServerErrorException('Erro ao criar seleção do dia');
    }
  }
}
