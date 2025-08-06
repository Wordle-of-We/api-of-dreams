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
} from '@nestjs/common';
import { DailySelectionService } from '../daily-selection/daily-selection.service';
import { CreateDailySelectionDto } from '../daily-selection/dto/create-daily-selection.dto';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

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
  // @UseGuards(JwtAuthGuard)
  // @Roles(Role.ADMIN)
  async manualDraw(@Body() body: { modeConfigId: number }) {
    try {
      const { modeConfigId } = body;
      return await this.svc.manualDraw(modeConfigId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('[DailySelection] Erro no manualDraw:', error);
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
}
