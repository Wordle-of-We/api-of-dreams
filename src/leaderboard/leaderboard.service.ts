import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, LeaderboardPeriod } from '@prisma/client';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  const delta = (day + 6) % 7;
  x.setDate(x.getDate() - delta);
  return x;
}

function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  return e;
}

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${dd}`;
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
    const raw =
      2000 -
      this.ATTEMPT_WEIGHT * b.attempts -
      this.TIME_WEIGHT * b.totalTimeSec -
      this.INTERVAL_WEIGHT * b.avgIntervalSec;

    return Math.max(0, Math.round(raw));
  }

  private async getPlayBreakdown(playId: number): Promise<ScoreBreakdown | null> {
    type PlayWithAttempts = Prisma.PlayGetPayload<{
      include: { attempts: { orderBy: { order: 'asc' } } };
    }>;

    const play = (await this.prisma.play.findUnique({
      where: { id: playId },
      include: { attempts: { orderBy: { order: 'asc' } } },
    })) as PlayWithAttempts | null;

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
        sum +=
          (attempts[i].createdAt.getTime() - attempts[i - 1].createdAt.getTime()) /
          1000;
      }
      avgIntervalSec = sum / (attempts.length - 1);
    }

    return { attempts: attempts.length, totalTimeSec, avgIntervalSec };
  }

  private async getCompletedPlaysWhere(where: Prisma.PlayWhereInput) {
    return this.prisma.play.findMany({
      where: { completed: true, userId: { not: null }, ...where },
      select: { id: true, userId: true, modeConfigId: true },
      orderBy: { id: 'desc' },
      take: 5000,
    });
  }

  private async aggregateScores(where: Prisma.PlayWhereInput) {
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

    const arr = Array.from(byUser.entries()).map(([userId, agg]) => ({
      userId,
      score: agg.score,
      games: agg.games,
    }));
    arr.sort((a, b) => b.score - a.score);
    return arr.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  private async writeSnapshot(params: {
    period: LeaderboardPeriod;
    scopeKey: string;
    meta: { date?: Date | null; weekStart?: Date | null; modeConfigId?: number | null };
    rows: { userId: number; score: number; games: number; rank: number }[];
  }) {
    const { period, scopeKey, meta, rows } = params;

    await this.prisma.leaderboardEntry.deleteMany({
      where: { period, scopeKey },
    });

    if (!rows.length) return rows;

    await this.prisma.leaderboardEntry.createMany({
      data: rows.map((r) => ({
        period,
        scopeKey,
        date: meta.date ?? null,
        weekStart: meta.weekStart ?? null,
        modeConfigId: meta.modeConfigId ?? null,
        userId: r.userId,
        score: r.score,
        games: r.games,
        rank: r.rank,
      })),
    });

    return rows;
  }

  async buildDailySnapshot(date = new Date(), modeId?: number) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const where: Prisma.PlayWhereInput = {
      createdAt: { gte: dayStart, lt: dayEnd },
      ...(modeId ? { modeConfigId: modeId } : {}),
    };

    const rows = await this.aggregateScores(where);
    const scopeKey = `DAILY:${ymdLocal(dayStart)}${modeId ? `:m=${modeId}` : ''}`;

    await this.writeSnapshot({
      period: 'DAILY',
      scopeKey,
      meta: { date: dayStart, weekStart: null, modeConfigId: modeId ?? null },
      rows,
    });

    return rows;
  }

  async buildWeeklySnapshot(date = new Date(), modeId?: number) {
    const wkStart = startOfWeek(date);
    const wkEnd = endOfWeek(date);
    const where: Prisma.PlayWhereInput = {
      createdAt: { gte: wkStart, lt: wkEnd },
      ...(modeId ? { modeConfigId: modeId } : {}),
    };

    const rows = await this.aggregateScores(where);
    const scopeKey = `WEEKLY:${ymdLocal(wkStart)}${modeId ? `:m=${modeId}` : ''}`;

    await this.writeSnapshot({
      period: 'WEEKLY',
      scopeKey,
      meta: { date: null, weekStart: wkStart, modeConfigId: modeId ?? null },
      rows,
    });

    return rows;
  }

  async buildAllTimeSnapshot(modeId?: number) {
    const where: Prisma.PlayWhereInput = {
      ...(modeId ? { modeConfigId: modeId } : {}),
    };

    const rows = await this.aggregateScores(where);
    const scopeKey = `ALL_TIME${modeId ? `:m=${modeId}` : ''}`;

    await this.writeSnapshot({
      period: 'ALL_TIME',
      scopeKey,
      meta: { date: null, weekStart: null, modeConfigId: modeId ?? null },
      rows,
    });

    return rows;
  }

  async getDailyRanking(date = new Date(), modeId?: number) {
    const d = startOfDay(date);
    const scopeKey = `DAILY:${ymdLocal(d)}${modeId ? `:m=${modeId}` : ''}`;

    let entries = await this.prisma.leaderboardEntry.findMany({
      where: { period: 'DAILY', scopeKey },
      orderBy: { rank: 'asc' },
    });

    if (entries.length === 0) {
      await this.buildDailySnapshot(d, modeId);
      entries = await this.prisma.leaderboardEntry.findMany({
        where: { period: 'DAILY', scopeKey },
        orderBy: { rank: 'asc' },
      });
    }

    const rows = await Promise.all(
      entries.map(async (e) => {
        const user = await this.prisma.user.findUnique({
          where: { id: e.userId },
          select: { id: true, username: true, avatarIconUrl: true },
        });
        return {
          rank: e.rank,
          userId: e.userId,
          username: user?.username ?? `user-${e.userId}`,
          avatarIconUrl: user?.avatarIconUrl ?? null,
          score: e.score,
          games: e.games,
        };
      })
    );
    return rows;
  }

  async getWeeklyRanking(date = new Date(), modeId?: number) {
    const wk = startOfWeek(date);
    const scopeKey = `WEEKLY:${ymdLocal(wk)}${modeId ? `:m=${modeId}` : ''}`;

    let entries = await this.prisma.leaderboardEntry.findMany({
      where: { period: 'WEEKLY', scopeKey },
      orderBy: { rank: 'asc' },
    });

    if (entries.length === 0) {
      await this.buildWeeklySnapshot(date, modeId);
      entries = await this.prisma.leaderboardEntry.findMany({
        where: { period: 'WEEKLY', scopeKey },
        orderBy: { rank: 'asc' },
      });
    }

    const rows = await Promise.all(
      entries.map(async (e) => {
        const user = await this.prisma.user.findUnique({
          where: { id: e.userId },
          select: { id: true, username: true, avatarIconUrl: true },
        });
        return {
          rank: e.rank,
          userId: e.userId,
          username: user?.username ?? `user-${e.userId}`,
          avatarIconUrl: user?.avatarIconUrl ?? null,
          score: e.score,
          games: e.games,
        };
      })
    );
    return rows;
  }

  async getLifetimeRanking(modeId?: number) {
    const scopeKey = `ALL_TIME${modeId ? `:m=${modeId}` : ''}`;

    let entries = await this.prisma.leaderboardEntry.findMany({
      where: { period: 'ALL_TIME', scopeKey },
      orderBy: { rank: 'asc' },
    });

    if (entries.length === 0) {
      await this.buildAllTimeSnapshot(modeId);
      entries = await this.prisma.leaderboardEntry.findMany({
        where: { period: 'ALL_TIME', scopeKey },
        orderBy: { rank: 'asc' },
      });
    }

    const rows = await Promise.all(
      entries.map(async (e) => {
        const user = await this.prisma.user.findUnique({
          where: { id: e.userId },
          select: { id: true, username: true, avatarIconUrl: true },
        });
        return {
          rank: e.rank,
          userId: e.userId,
          username: user?.username ?? `user-${e.userId}`,
          avatarIconUrl: user?.avatarIconUrl ?? null,
          score: e.score,
          games: e.games,
        };
      })
    );
    return rows;
  }
}
