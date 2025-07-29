import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OverviewStatsDto } from './dto/overview-stats.dto';
import { ModeStatsDto } from './dto/mode-stats.dto';
import { PlayStatsDto } from './dto/play-stats.dto';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) { }

  async getOverview(date?: Date): Promise<OverviewStatsDto> {
    const d = date ?? new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);

    const overview = await this.prisma.dailyOverview.findFirst({
      where: { date: { gte: start, lt: end } },
      include: {
        modeStats: {
          include: { modeConfig: { select: { name: true } } }
        }
      }
    });

    const totalUsersEver = await this.prisma.user.count();

    if (!overview) {
      return {
        totalUsersEver,
        totalNewUsers: 0,
        totalInitiatedPlays: 0,
        totalCompletedPlays: 0,
        totalUncompletedPlays: 0,
        playsByMode: {},
        allPlays: []
      };
    }

    const playsByMode: OverviewStatsDto['playsByMode'] = {};
    for (const m of overview.modeStats) {
      playsByMode[m.modeConfig.name] = {
        initiated: m.initiatedPlays,
        completed: m.completedPlays,
        uncompleted: m.uncompletedPlays,
      };
    }

    const allPlays = await this.prisma.play.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        id: true,
        modeConfigId: true,
        modeConfig: { select: { name: true } },
        completed: true,
        attemptsCount: true,
      }
    });

    return {
      totalUsersEver,
      totalNewUsers: overview.totalNewUsers,
      totalInitiatedPlays: overview.totalInitiatedPlays,
      totalCompletedPlays: overview.totalCompletedPlays,
      totalUncompletedPlays: overview.totalUncompletedPlays,
      playsByMode,
      allPlays: allPlays.map(p => ({
        playId: p.id,
        modeConfigId: p.modeConfigId,
        modeName: p.modeConfig.name,
        completed: p.completed,
        attemptsCount: p.attemptsCount,
      }))
    };
  }

  async getModeStats(
    modeConfigId: number,
    date?: Date
  ): Promise<ModeStatsDto> {
    const d = date ?? new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);

    // busca o snapshot daquele modo
    const ms = await this.prisma.modeDailyStats.findFirst({
      where: {
        modeConfigId,
        date: { gte: start, lt: end }
      },
      include: { modeConfig: { select: { name: true } } }
    });

    if (!ms) {
      const mode = await this.prisma.modeConfig.findUnique({
        where: { id: modeConfigId },
        select: { name: true }
      });
      return {
        modeConfigId,
        modeName: mode?.name ?? 'Desconhecido',
        initiatedPlays: 0,
        completedPlays: 0,
        uncompletedPlays: 0,
        averageAttempts: 0,
        uniqueUsers: 0,
      };
    }

    return {
      modeConfigId,
      modeName: ms.modeConfig.name,
      initiatedPlays: ms.initiatedPlays,
      completedPlays: ms.completedPlays,
      uncompletedPlays: ms.uncompletedPlays,
      averageAttempts: ms.averageAttempts,
      uniqueUsers: ms.uniqueUsers,
    };
  }

  async getPlayStats(playId: number): Promise<PlayStatsDto> {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: {
        attempts: {
          orderBy: { createdAt: 'asc' },
          select: { guess: true, isCorrect: true }
        }
      }
    });
    if (!play) {
      throw new NotFoundException('Play não encontrada');
    }

    return {
      playId,
      userId: play.userId ?? undefined,
      guestId: play.guestId ?? undefined,
      startedAt: play.createdAt,
      completed: play.completed,
      attempts: play.attempts.map(a => a.guess),
      attemptsCount: play.attemptsCount,
    };
  }
}
