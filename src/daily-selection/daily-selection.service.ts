import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GameMode } from '@prisma/client';

@Injectable()
export class DailySelectionService {
  private readonly logger = new Logger(DailySelectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 * * *', { timeZone: 'America/Fortaleza' })
  async triggerGenerateRoute() {
    await this.handleDailyDraw();
  }

  async handleDailyDraw() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeModes = await this.prisma.modeConfig.findMany({
      where: { isActive: true },
      select: { mode: true },
    });
    const modes = activeModes.map((m) => m.mode as GameMode);

    const usedToday = new Set<number>();

    for (const mode of modes) {
      const exists = await this.prisma.dailySelection.findUnique({
        where: { date_mode: { date: today, mode } },
      });
      if (exists) {
        this.logger.log(`Já existe seleção para ${mode} em ${today.toDateString()}`);
        usedToday.add(exists.characterId);
        continue;
      }

      const where = {
        AND: [
          {
            id: { notIn: Array.from(usedToday) },
          },
          {
            NOT: {
              dailySelections: {
                some: {
                  mode,
                  date: { gte: thirtyDaysAgo },
                },
              },
            },
          },
        ],
      };

      const total = await this.prisma.character.count({ where });
      if (total === 0) {
        this.logger.warn(
          `Sem candidatos disponíveis para modo ${mode} (já rolou tudo nos últimos 30 dias ou usado hoje)`,
        );
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
          mode,
          character: { connect: { id: character.id } },
        },
      });

      this.logger.log(`Sorteado para ${mode}: ${character.name}`);

      usedToday.add(character.id);
    }
  }

  async getTodaySelection(mode?: GameMode) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.dailySelection.findMany({
      where: { date: today, ...(mode && { mode }) },
      include: { character: true },
    });
  }
}
