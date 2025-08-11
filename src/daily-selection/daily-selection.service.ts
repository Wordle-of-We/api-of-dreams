import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  fortalezaDayStart,
  fortalezaDayStartFromYYYYMMDD,
} from '../../utils/dayStart';

type DailySelectionWithRelations = Prisma.DailySelectionGetPayload<{
  include: { character: true; modeConfig: true };
}>;

@Injectable()
export class DailySelectionService {
  private readonly logger = new Logger(DailySelectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Chave YYYY-MM-DD calculada em America/Fortaleza */
  private dayKeyFortaleza(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  /** Executa todo dia 00:00 em America/Fortaleza */
  @Cron('0 0 * * *', { timeZone: 'America/Fortaleza' })
  async triggerGenerateRoute() {
    await this.handleDailyDraw();
  }

  async handleDailyDraw() {
    const today = fortalezaDayStart();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const modeConfigs = await this.prisma.modeConfig.findMany({
      where: { isActive: true },
    });

    // guarda ids já usados hoje (para não repetir entre modos no mesmo dia)
    const usedToday = new Set<number>();

    for (const modeConfig of modeConfigs) {
      // se já existe seleção para o modo hoje, reaproveita
      const existing = await this.prisma.dailySelection.findFirst({
        where: { date: today, modeConfigId: modeConfig.id, latest: true },
        orderBy: { id: 'desc' },
      });

      if (existing) {
        usedToday.add(existing.characterId);
        continue;
      }

      const where: Prisma.CharacterWhereInput = {
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

      // no modo Imagem, garanta segunda imagem
      if (modeConfig.name === 'Imagem') {
        (where.AND as Prisma.CharacterWhereInput[]).push({
          imageUrl2: { not: null },
        });
      }

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

      // invalida "latest" anteriores do dia/modo (hardening)
      await this.prisma.dailySelection.updateMany({
        where: { date: today, modeConfigId: modeConfig.id, latest: true },
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
    const today = fortalezaDayStart();

    const [character, modeConfig] = await Promise.all([
      this.prisma.character.findUnique({ where: { id: dto.characterId } }),
      this.prisma.modeConfig.findUnique({ where: { id: dto.modeConfigId } }),
    ]);

    if (!character || !modeConfig) {
      throw new NotFoundException('Character ou ModeConfig não encontrados.');
    }

    await this.prisma.dailySelection.updateMany({
      where: { date: today, modeConfigId: dto.modeConfigId, latest: true },
      data: { latest: false },
    });

    return this.prisma.dailySelection.create({
      data: {
        date: today,
        latest: true,
        character: { connect: { id: dto.characterId } },
        modeConfig: { connect: { id: dto.modeConfigId } },
      },
      include: { character: true, modeConfig: true },
    });
  }

  async manualDraw(modeConfigId: number) {
    const today = fortalezaDayStart();

    const mode = await this.prisma.modeConfig.findUnique({ where: { id: modeConfigId } });
    if (!mode) throw new NotFoundException('ModeConfig não encontrado.');

    // personagens já usados hoje (qualquer modo)
    const existingToday = await this.prisma.dailySelection.findMany({
      where: { date: today },
      select: { characterId: true },
    });
    const usedIds = existingToday.map((sel) => sel.characterId);

    const where: Prisma.CharacterWhereInput = {
      AND: [
        { id: { notIn: usedIds } },
        {
          NOT: {
            dailySelections: {
              some: {
                modeConfigId,
                date: { gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) },
              },
            },
          },
        },
      ],
    };

    if (mode.name === 'Imagem') {
      (where.AND as Prisma.CharacterWhereInput[]).push({
        imageUrl2: { not: null },
      });
    }

    const total = await this.prisma.character.count({ where });
    if (total === 0) {
      throw new NotFoundException('Nenhum personagem disponível para sorteio.');
    }

    const skip = Math.floor(Math.random() * total);
    const [character] = await this.prisma.character.findMany({ where, skip, take: 1 });

    await this.prisma.dailySelection.updateMany({
      where: { date: today, modeConfigId, latest: true },
      data: { latest: false },
    });

    return this.prisma.dailySelection.create({
      data: {
        date: today,
        latest: true,
        character: { connect: { id: character.id } },
        modeConfig: { connect: { id: modeConfigId } },
      },
      include: { character: true, modeConfig: true },
    });
  }

  async getTodaySelection(modeId?: number) {
    const today = fortalezaDayStart();

    const where: Prisma.DailySelectionWhereInput = { date: today };
    if (modeId !== undefined) where.modeConfigId = modeId;

    return this.prisma.dailySelection.findMany({
      where,
      include: { character: true, modeConfig: true },
    });
  }

  async getTodayLatestSelections(modeId?: number) {
    const today = fortalezaDayStart();

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
    const today = fortalezaDayStart();

    return this.prisma.dailySelection.findMany({
      where: { date: today },
      include: { character: true, modeConfig: true },
      orderBy: { id: 'desc' },
    });
  }

  async getLatestByMode(modeId: number) {
    return this.prisma.dailySelection.findFirst({
      where: { modeConfigId: modeId, latest: true },
      include: { character: true },
      orderBy: { id: 'desc' },
    });
  }

  async getCalendarDays(params: { modeId?: number; from?: string; to?: string }) {
    const where: Prisma.DailySelectionWhereInput = { latest: true };
    if (params.modeId) where.modeConfigId = params.modeId;

    if (params.from || params.to) {
      const from = params.from ? fortalezaDayStartFromYYYYMMDD(params.from) : undefined;
      const to = params.to ? fortalezaDayStartFromYYYYMMDD(params.to) : undefined;
      where.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const rows = await this.prisma.dailySelection.findMany({
      where,
      select: { date: true, modeConfigId: true },
      orderBy: [{ date: 'asc' }, { modeConfigId: 'asc' }],
    });

    const map = new Map<string, number[]>();
    for (const r of rows) {
      const key = this.dayKeyFortaleza(r.date);
      const arr = map.get(key) ?? [];
      arr.push(r.modeConfigId);
      map.set(key, arr);
    }

    return Array.from(map.entries()).map(([day, modes]) => ({ day, modes }));
  }

  async getLatestByDateAndMode(modeId: number, date: string) {
    const day = fortalezaDayStartFromYYYYMMDD(date);
    const sel = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId: modeId, date: day, latest: true },
      include: { character: true, modeConfig: true },
      orderBy: { id: 'desc' },
    });
    return sel;
  }

  async repairLatestForDay(date: string, modeId?: number) {
    const day = fortalezaDayStartFromYYYYMMDD(date);

    const where: Prisma.DailySelectionWhereInput = {
      date: day,
      ...(modeId ? { modeConfigId: modeId } : {}),
    };

    const groups = await this.prisma.dailySelection.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    // Agrupa por modo
    const byMode = new Map<number, typeof groups>();
    for (const g of groups) {
      const arr = byMode.get(g.modeConfigId) ?? [];
      arr.push(g);
      byMode.set(g.modeConfigId, arr);
    }

    for (const [, arr] of byMode.entries()) {
      if (arr.length === 0) continue;
      const last = arr[arr.length - 1];

      const idsToLatestFalse = arr
        .filter((x) => x.id !== last.id && x.latest)
        .map((x) => x.id);
      const needsLastTrue = !last.latest;

      if (idsToLatestFalse.length) {
        await this.prisma.dailySelection.updateMany({
          where: { id: { in: idsToLatestFalse } },
          data: { latest: false },
        });
      }
      if (needsLastTrue) {
        await this.prisma.dailySelection.update({
          where: { id: last.id },
          data: { latest: true },
        });
      }
    }

    return { repaired: true };
  }
}
