import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

type DailySelectionWithRelations = Prisma.DailySelectionGetPayload<{
  include: { character: true; modeConfig: true };
}>;

@Injectable()
export class DailySelectionService {
  private readonly logger = new Logger(DailySelectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('31 00 * * *', { timeZone: 'America/Fortaleza' })
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
      const existing = await this.prisma.dailySelection.findFirst({
        where: { date: today, modeConfigId: modeConfig.id },
        orderBy: { id: 'desc' },
      });

      if (existing) {
        usedToday.add(existing.characterId);
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
      const [character] = await this.prisma.character.findMany({ where, skip, take: 1 });

      await this.prisma.dailySelection.updateMany({
        where: { date: today, modeConfigId: modeConfig.id },
        data: { latest: false },
      });

      await this.prisma.dailySelection.create({
        data: {
          date: today,
          latest: true,
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

    const [character, modeConfig] = await Promise.all([
      this.prisma.character.findUnique({ where: { id: dto.characterId } }),
      this.prisma.modeConfig.findUnique({ where: { id: dto.modeConfigId } }),
    ]);

    if (!character || !modeConfig) {
      throw new NotFoundException('Character ou ModeConfig não encontrados.');
    }

    await this.prisma.dailySelection.updateMany({
      where: {
        date: today,
        modeConfigId: dto.modeConfigId,
      },
      data: {
        latest: false,
      },
    });

    return this.prisma.dailySelection.create({
      data: {
        date: today,
        latest: true,
        character: { connect: { id: dto.characterId } },
        modeConfig: { connect: { id: dto.modeConfigId } },
      },
    });
  }

  async manualDraw(characterId: number, modeConfigId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ch, mode] = await Promise.all([
      this.prisma.character.findUnique({ where: { id: characterId } }),
      this.prisma.modeConfig.findUnique({ where: { id: modeConfigId } }),
    ]);

    if (!ch || !mode) {
      throw new NotFoundException('Character ou ModeConfig não encontrados.');
    }

    await this.prisma.dailySelection.updateMany({
      where: {
        date: today,
        modeConfigId,
      },
      data: {
        latest: false,
      },
    });

    return this.prisma.dailySelection.create({
      data: {
        date: today,
        latest: true,
        character: { connect: { id: characterId } },
        modeConfig: { connect: { id: modeConfigId } },
      },
    });
  }

  async getTodaySelection(modeId?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = { date: today };
    if (modeId !== undefined) {
      where.modeConfigId = modeId;
    }

    return this.prisma.dailySelection.findMany({
      where,
      include: { character: true, modeConfig: true },
    });
  }

  async getTodayLatestSelections(modeId?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.dailySelection.findMany({
      where: {
        date: today,
        latest: true,
        ...(modeId !== undefined ? { modeConfigId: modeId } : {}),
      },
      include: { character: true, modeConfig: true },
      orderBy: { id: 'desc' },
    });
  }

  async getAllTodayRaw(): Promise<DailySelectionWithRelations[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.dailySelection.findMany({
      where: { date: today },
      include: { character: true, modeConfig: true },
      orderBy: { id: 'desc' },
    });
  }
}
