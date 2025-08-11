import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  InternalServerErrorException,
  NotFoundException,
  UseGuards,
  Param,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { DailySelectionService } from '../daily-selection/daily-selection.service';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../src/auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

type DailySelectionWithRelations = Prisma.DailySelectionGetPayload<{
  include: { character: true; modeConfig: true };
}>;

@Controller('daily-selection')
export class DailySelectionController {
  private readonly logger = new Logger(DailySelectionController.name);

  constructor(private readonly svc: DailySelectionService) { }

  @Get()
  async findToday(
    @Query('modeId') modeId?: string
  ): Promise<Record<string, { modeConfigId: number; character: DailySelectionWithRelations['character'] }>> {
    const id = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;

    const selections = await this.svc.getTodayLatestSelections(id);

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

  @Post('manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async manualDraw(@Body() body: { modeConfigId: number; characterId?: number }) {
    try {
      const { modeConfigId, characterId } = body;
      if (characterId) {
        return await this.svc.createManualSelection({ modeConfigId, characterId });
      }
      return await this.svc.manualDraw(modeConfigId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('[DailySelection] Erro no manualDraw', error as any);
      throw new InternalServerErrorException('Erro ao realizar sorteio manual');
    }
  }

  @Get('latest')
  async getLatest(
    @Query('modeId') modeId?: string
  ): Promise<DailySelectionWithRelations[]> {
    const id = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.getTodayLatestSelections(id);
  }

  @Get('all-today')
  async allTodayRaw(): Promise<DailySelectionWithRelations[]> {
    return this.svc.getAllTodayRaw();
  }

  @Get(':modeId')
  async getSelectionByMode(@Param('modeId', ParseIntPipe) modeId: number) {
    const selection = await this.svc.getLatestByMode(modeId);
    if (!selection) {
      throw new NotFoundException(`Seleção não encontrada para o modo ${modeId}`);
    }

    return {
      modeConfigId: selection.modeConfigId,
      character: selection.character,
    };
  }

  @Get('calendar')
  async calendar(
    @Query('modeId') modeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.getCalendarDays({ modeId: m, from, to });
  }

  @Get('by-date')
  async byDate(
    @Query('modeId') modeId: string,
    @Query('date') date: string,
  ) {
    const m = parseInt(modeId, 10);
    const sel = await this.svc.getLatestByDateAndMode(m, date);
    if (!sel) {
      throw new NotFoundException(`Sem seleção para ${date} no modo ${modeId}`);
    }
    return sel;
  }

  @Post('repair-latest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async repairLatest(
    @Body() body: { date: string; modeId?: number },
  ) {
    return this.svc.repairLatestForDay(body.date, body.modeId);
  }
}
