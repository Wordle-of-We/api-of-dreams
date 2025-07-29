import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OverviewStatsDto } from './dto/overview-stats.dto';
import { ModeStatsDto } from './dto/mode-stats.dto';
import { PlayStatsDto } from './dto/play-stats.dto';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) { }

  private buildDayStart(dateStr?: string): Date {
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  async getOverview(date?: string): Promise<OverviewStatsDto> {
    const day = this.buildDayStart(date);
    const overview = await this.prisma.dailyOverview.findUnique({
      where: { date: day },
      include: {
        modeStats: {
          include: {
            modeConfig: { select: { name: true } }
          }
        }
      }
    });
    if (!overview) {
      throw new NotFoundException('Nenhum snapshot para esta data');
    }

    const playsByMode: OverviewStatsDto['playsByMode'] = {};
    for (const stat of overview.modeStats) {
      playsByMode[stat.modeConfig.name] = {
        initiated: stat.initiatedPlays,
        completed: stat.completedPlays,
        uncompleted: stat.uncompletedPlays,
      };
    }

    return {
      totalUsersEver: overview.totalUsersEver,
      totalNewUsers: overview.totalNewUsers,
      totalInitiatedPlays: overview.totalInitiatedPlays,
      totalCompletedPlays: overview.totalCompletedPlays,
      totalUncompletedPlays: overview.totalUncompletedPlays,
      playsByMode
    };
  }

  async getModeStats(
    modeConfigId: number,
    date?: string,
  ): Promise<ModeStatsDto> {
    const day = this.buildDayStart(date);
    const ms = await this.prisma.modeDailyStats.findUnique({
      where: {
        date_modeConfigId: {
          date: day,
          modeConfigId,
        }
      },
      include: {
        modeConfig: { select: { name: true } }
      }
    });
    if (!ms) {
      throw new NotFoundException('Nenhum snapshot para este modo e data');
    }

    return {
      modeConfigId: ms.modeConfigId,
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
          select: { guess: true, isCorrect: true },
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
