import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DailySelectionService {
  private readonly logger = new Logger(DailySelectionService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron('12 10 * * *', { timeZone: 'America/Fortaleza' })
  async triggerGenerateRoute() {
    await this.handleDailyDraw();
  }

  async handleDailyDraw() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const modeConfigs = await this.prisma.modeConfig.findMany({
      where: { isActive: true },
    });

    const usedToday = new Set<number>();

    for (const modeConfig of modeConfigs) {
      const exists = await this.prisma.dailySelection.findUnique({
        where: {
          date_modeConfigId: {
            date: today,
            modeConfigId: modeConfig.id,
          },
        },
      });
      if (exists) {
        usedToday.add(exists.characterId);
        continue;
      }
      
      const where = {
        AND: [
          { id: { notIn: Array.from(usedToday) } },
          {
            NOT: {
              dailySelections: {
                some: {
                  modeConfigId: modeConfig.id,
                  date: { gte: thirtyDaysAgo },
                },
              },
            },
          },
        ],
      };
      
      const total = await this.prisma.character.count({ where });
      if (total === 0) {
        this.logger.warn(`Sem candidatos para modo ${modeConfig.name}`);
        continue;
      }
      
      const skip = Math.floor(Math.random() * total);
      const [character] = await this.prisma.character.findMany({
        where,
        skip,
        take: 1,
      });
      
      await this.prisma.dailySelection.create({
        data: {
          date: today,
          modeConfig: { connect: { id: modeConfig.id } },
          character: { connect: { id: character.id } },
        },
      });
      
      usedToday.add(character.id);
      this.logger.log(`Sorteado ${character.name} para modo ${modeConfig.name}`);
    }
  }

  async createManualSelection(dto: { characterId: number; modeConfigId: number }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const character = await this.prisma.character.findUnique({
      where: { id: dto.characterId },
    });

    const modeConfig = await this.prisma.modeConfig.findUnique({
      where: { id: dto.modeConfigId },
    });

    if (!character || !modeConfig) {
      throw new Error('Character ou ModeConfig não encontrados.');
    }

    return this.prisma.dailySelection.create({
      data: {
        date: today,
        character: { connect: { id: dto.characterId } },
        modeConfig: { connect: { id: dto.modeConfigId } },
      },
    });
  }
  
  async getTodaySelection(modeId?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where: any = { date: today };
    if (modeId) where.modeConfigId = modeId;
    
    return this.prisma.dailySelection.findMany({
      where,
      include: { character: true, modeConfig: true },
    });
  }

}
