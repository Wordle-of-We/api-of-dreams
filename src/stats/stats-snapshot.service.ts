import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsSnapshotService {
  constructor(private readonly prisma: PrismaService) { }

  private dayStart(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  @Cron('* */01 * * *')
  async syncDay() {
    const today = this.dayStart(new Date());
    await this.updateDailyOverview(today);
    const modes = await this.prisma.modeConfig.findMany({ where: { isActive: true } });
    for (const m of modes) {
      await this.updateModeStatsForDay(m.id, today);
    }
  }

  async updateDailyOverview(date: Date) {
    const day = this.dayStart(date);
    const totalUsersEver = await this.prisma.user.count();
    const totalNewUsers = await this.prisma.user.count({ where: { createdAt: { gte: day } } });
    const plays = await this.prisma.play.findMany({ where: { createdAt: { gte: day } } });
    const initiated = plays.length;
    const completed = plays.filter(p => p.completed).length;
    const uncompleted = initiated - completed;

    await this.prisma.dailyOverview.upsert({
      where: { date: day },
      create: { date: day, totalUsersEver, totalNewUsers, totalInitiatedPlays: initiated, totalCompletedPlays: completed, totalUncompletedPlays: uncompleted },
      update: { totalUsersEver, totalNewUsers, totalInitiatedPlays: initiated, totalCompletedPlays: completed, totalUncompletedPlays: uncompleted },
    });
  }

  async updateModeStatsForDay(modeConfigId: number, date: Date) {
    const day = this.dayStart(date);
    const plays = await this.prisma.play.findMany({ where: { modeConfigId, createdAt: { gte: day } } });
    const i = plays.length;
    const c = plays.filter(p => p.completed).length;
    const u = i - c;
    const avg = c > 0 ? plays.filter(p => p.completed).reduce((s, p) => s + p.attemptsCount, 0) / c : 0;
    const uniq = (await this.prisma.play.findMany({
      where: { modeConfigId, createdAt: { gte: day }, userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    })).length;

    await this.updateDailyOverview(day);
    const overview = await this.prisma.dailyOverview.findUnique({ where: { date: day } });

    await this.prisma.modeDailyStats.upsert({
      where: { date_modeConfigId: { date: day, modeConfigId } },
      create: { date: day, modeConfigId, initiatedPlays: i, completedPlays: c, uncompletedPlays: u, averageAttempts: avg, uniqueUsers: uniq, overviewId: overview!.id },
      update: { initiatedPlays: i, completedPlays: c, uncompletedPlays: u, averageAttempts: avg, uniqueUsers: uniq },
    });
  }
}
