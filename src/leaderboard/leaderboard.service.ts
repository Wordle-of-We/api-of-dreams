import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type ScoreBreakdown = {
  attempts: number;
  totalTimeSec: number;
  avgIntervalSec: number;
};

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly ATTEMPT_WEIGHT = 120;
  private readonly TIME_WEIGHT = 0.2;
  private readonly INTERVAL_WEIGHT = 3;

  private computeScore(b: ScoreBreakdown) {
    const raw = 2000
      - this.ATTEMPT_WEIGHT * b.attempts
      - this.TIME_WEIGHT * b.totalTimeSec
      - this.INTERVAL_WEIGHT * b.avgIntervalSec;

    return Math.max(0, Math.round(raw));
  }

  private async getPlayBreakdown(playId: number): Promise<ScoreBreakdown | null> {
    type PlayWithAttempts = Prisma.PlayGetPayload<{
      include: { attempts: { orderBy: { order: 'asc' } } }
    }>;

    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: {
        attempts: { orderBy: { order: 'asc' } },
      },
    }) as PlayWithAttempts | null;

    if (!play || !play.completed) return null;

    const attempts = play.attempts;
    if (!attempts.length) return null;

    const first = attempts[0].createdAt;
    const end = play.completedAt ?? attempts[attempts.length - 1].createdAt;

    const totalTimeSec = Math.max(0, (end.getTime() - first.getTime()) / 1000);

    let avgIntervalSec = 0;
    if (attempts.length > 1) {
      let sum = 0;
      for (let i = 1; i < attempts.length; i++) {
        sum += (attempts[i].createdAt.getTime() - attempts[i - 1].createdAt.getTime()) / 1000;
      }
      avgIntervalSec = sum / (attempts.length - 1);
    }

    return {
      attempts: attempts.length,
      totalTimeSec,
      avgIntervalSec,
    };
  }

  private async getCompletedPlaysWhere(where: any) {
    return this.prisma.play.findMany({
      where: { completed: true, userId: { not: null }, ...where },
      select: { id: true, userId: true, modeConfigId: true },
      orderBy: { id: 'desc' },
      take: 5000,
    });
  }

  async getDailyRanking(date = new Date(), modeId?: number) {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    const where: any = {
      createdAt: { gte: dayStart, lt: dayEnd },
      ...(modeId ? { modeConfigId: modeId } : {}),
    };

    const plays = await this.getCompletedPlaysWhere(where);

    const byUser = new Map<number, { score: number; games: number }>();
    for (const p of plays) {
      const breakdown = await this.getPlayBreakdown(p.id);
      if (!breakdown) continue;
      const score = this.computeScore(breakdown);

      const curr = byUser.get(p.userId!) ?? { score: 0, games: 0 };
      curr.score += score;
      curr.games += 1;
      byUser.set(p.userId!, curr);
    }

    const rows = await Promise.all(
      Array.from(byUser.entries()).map(async ([userId, agg]) => {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, avatarIconUrl: true } });
        return { userId, username: user?.username ?? `user-${userId}`, avatarIconUrl: user?.avatarIconUrl ?? null, score: agg.score, games: agg.games };
      })
    );

    rows.sort((a, b) => b.score - a.score);
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }

  async getLifetimeRanking(modeId?: number) {
    const where: any = { ...(modeId ? { modeConfigId: modeId } : {}) };
    const plays = await this.getCompletedPlaysWhere(where);

    const byUser = new Map<number, { score: number; games: number }>();
    for (const p of plays) {
      const breakdown = await this.getPlayBreakdown(p.id);
      if (!breakdown) continue;
      const score = this.computeScore(breakdown);

      const curr = byUser.get(p.userId!) ?? { score: 0, games: 0 };
      curr.score += score;
      curr.games += 1;
      byUser.set(p.userId!, curr);
    }

    const rows = await Promise.all(
      Array.from(byUser.entries()).map(async ([userId, agg]) => {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, avatarIconUrl: true } });
        return { userId, username: user?.username ?? `user-${userId}`, avatarIconUrl: user?.avatarIconUrl ?? null, score: agg.score, games: agg.games };
      })
    );

    rows.sort((a, b) => b.score - a.score);
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }
}
