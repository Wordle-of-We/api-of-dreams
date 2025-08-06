import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DailySelectionService } from '../daily-selection/daily-selection.service';
import { CreateDailySelectionDto } from '../daily-selection/dto/create-daily-selection.dto';
import { Prisma } from '@prisma/client';

type DailySelectionWithRelations = Prisma.DailySelectionGetPayload<{
  include: { character: true; modeConfig: true };
}>;

@Controller('daily-selection')
export class DailySelectionController {
  constructor(private readonly svc: DailySelectionService) {}

  @Get()
  async findToday(
    @Query('modeId') modeId?: string
  ): Promise<Record<string, { modeConfigId: number; character: DailySelectionWithRelations['character'] }>> {
    const id = modeId ? parseInt(modeId, 10) : undefined;

    const selections = (await this.svc.getTodayLatestSelections(id)) as DailySelectionWithRelations[];

    const result: Record<
      string,
      { modeConfigId: number; character: DailySelectionWithRelations['character'] }
    > = {};

    for (const sel of selections) {
      result[sel.modeConfig.name] = {
        modeConfigId: sel.modeConfig.id,
        character: sel.character,
      };
    }

    return result;
  }

  @Get('latest')
  async findAllToday(
    @Query('modeId') modeId?: string
  ): Promise<DailySelectionWithRelations[]> {
    const id = modeId ? parseInt(modeId, 10) : undefined;
    return this.svc.getTodayLatestSelections(id);
  }

  @Post()
  async createDailySelection(
    @Body() dto: CreateDailySelectionDto
  ) {
    try {
      return await this.svc.createManualSelection(dto);
    } catch (error) {
      console.error('[DailySelection] Erro ao criar manualmente:', error);
      throw new InternalServerErrorException('Erro ao criar seleção do dia');
    }
  }

  @Post('manual')
  async manualDraw(
    @Body() dto: CreateDailySelectionDto
  ) {
    try {
      return await this.svc.manualDraw(dto.characterId, dto.modeConfigId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('[DailySelection] Erro no manualDraw:', error);
      throw new InternalServerErrorException('Erro ao realizar sorteio manual');
    }
  }

  @Get('manual/latest')
  async manualLatest(
    @Query('modeId') modeId?: string
  ): Promise<DailySelectionWithRelations[]> {
    const id = modeId ? parseInt(modeId, 10) : undefined;
    return this.svc.getTodayLatestSelections(id);
  }
}
