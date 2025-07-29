import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { KPI, TopCharacter } from './dto/kpi.dto'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  private startOfDay(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }

  async getKPIs(): Promise<KPI> {
    const today = this.startOfDay()

    const totalUsers = await this.prisma.user.count()

    const activeGroups = await this.prisma.play.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: today }, userId: { not: null } },
    })
    const activeUsers = activeGroups.length

    const dailyGames = await this.prisma.play.count({
      where: { createdAt: { gte: today } },
    })

    const totalAttempts = await this.prisma.attempt.count({
      where: { createdAt: { gte: today } },
    })

    const modes = await this.prisma.modeConfig.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })

    const topCharacters: Record<string, TopCharacter[]> = {}
    for (const mode of modes) {
      const groups = await this.prisma.attempt.groupBy({
        by: ['guessedCharacterId'],
        where: {
          modeConfigId: mode.id,
          createdAt: { gte: today },
          guessedCharacterId: { not: null },
        },
        _count: { guessedCharacterId: true },
        orderBy: { _count: { guessedCharacterId: 'desc' } },
        take: 5,
      })
      const chars = await this.prisma.character.findMany({
        where: { id: { in: groups.map(g => g.guessedCharacterId!) } },
        select: { id: true, name: true },
      })
      topCharacters[mode.name] = groups.map(g => ({
        character:
          chars.find(c => c.id === g.guessedCharacterId)?.name ??
          'Unknown',
        count: g._count!.guessedCharacterId,
      }))
    }

    const accessLogs = await this.prisma.accessLog.findMany({
      where: { createdAt: { gte: today } },
      select: { createdAt: true },
    })
    const attemptLogs = await this.prisma.attempt.findMany({
      where: { createdAt: { gte: today } },
      select: { createdAt: true },
    })
    const buckets = [0, 4, 8, 12, 16, 20]
    const accessLabels = buckets.map(h => `${h.toString().padStart(2, '0')}:00`)
    const accessCounts = buckets.map(
      h => accessLogs.filter(l => l.createdAt.getHours() === h).length,
    )
    const attemptCounts = buckets.map(
      h => attemptLogs.filter(a => a.createdAt.getHours() === h).length,
    )

    const modeLabels = modes.map(m => m.name)
    const modeUsageCounts = await Promise.all(
      modes.map(m =>
        this.prisma.play.count({
          where: { modeConfigId: m.id, createdAt: { gte: today } },
        }),
      ),
    )

    const modeAttemptCounts = await Promise.all(
      modes.map(m =>
        this.prisma.attempt.count({
          where: { modeConfigId: m.id, createdAt: { gte: today } },
        }),
      ),
    )
    const modeHitCounts = await Promise.all(
      modes.map(m =>
        this.prisma.attempt.count({
          where: {
            modeConfigId: m.id,
            isCorrect: true,
            createdAt: { gte: today },
          },
        }),
      ),
    )

    return {
      totalUsers,
      activeUsers,
      dailyGames,
      totalAttempts,
      topCharacters,
      accessData: {
        labels: accessLabels,
        datasets: [
          { label: 'Acessos', data: accessCounts },
          { label: 'Tentativas', data: attemptCounts },
        ],
      },
      modeUsageData: {
        labels: modeLabels,
        datasets: [{ data: modeUsageCounts }],
      },
      attemptsData: {
        labels: modeLabels,
        datasets: [
          { label: 'Tentativas', data: modeAttemptCounts },
          { label: 'Acertos', data: modeHitCounts },
        ],
      },
    }
  }
}
