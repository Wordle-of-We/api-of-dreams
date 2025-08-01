// src/plays/plays.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { v4 as uuidv4 } from 'uuid'
import { StatsSnapshotService } from '../stats/stats-snapshot.service'

export interface Comparison<T> {
  guessed: T
  target: T
}

export interface GuessResult {
  attemptNumber: number
  guess: string
  isCorrect: boolean
  playCompleted: boolean
  guessedImageUrl1: string | null
  comparison: Record<string, Comparison<string> | Comparison<string[]>>
  triedAt: Date
}

@Injectable()
export class PlaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsSnapshot: StatsSnapshotService,
  ) {}

  async startPlay(userId: number | undefined, modeConfigId: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (userId) {
      const existing = await this.prisma.play.findFirst({
        where: { userId, modeConfigId, createdAt: { gte: today } },
      })
      if (existing) {
        return {
          playId: existing.id,
          completed: existing.completed,
          attemptsCount: existing.attemptsCount,
        }
      }
    }

    const guestId = userId ? null : uuidv4()
    const sel = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId },
      orderBy: { date: 'desc' },
    })
    if (!sel) {
      throw new NotFoundException('Nenhum personagem selecionado hoje')
    }

    const play = await this.prisma.play.create({
      data: {
        userId: userId ?? undefined,
        guestId: guestId ?? undefined,
        modeConfigId,
        characterId: sel.characterId,
      },
    })

    await this.statsSnapshot.syncDay()

    const base = {
      playId: play.id,
      completed: false,
      attemptsCount: 0,
    }
    return userId ? base : { ...base, guestId }
  }

  async makeGuess(
    userId: number | undefined,
    playId: number,
    guess: string,
  ): Promise<GuessResult> {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: {
        modeConfig: { select: { name: true } },
        character: { include: { franchises: { include: { franchise: true } } } },
      },
    })
    if (!play) {
      throw new NotFoundException('Partida não encontrada')
    }
    if (play.completed) {
      throw new BadRequestException('Partida já concluída')
    }

    const mode = play.modeConfig.name
    const target = play.character
    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const already = await this.prisma.attempt.findFirst({
      where: {
        ...ownerFilter,
        modeConfigId: play.modeConfigId,
        targetCharacterId: target.id,
        guess: guess.trim(),
        createdAt: { gte: startOfDay },
      },
    })
    if (already) {
      throw new BadRequestException(
        'Você já chutou esse personagem hoje neste modo',
      )
    }

    const guessed = await this.prisma.character.findUnique({
      where: { name: guess.trim() },
      include: { franchises: { include: { franchise: true } } },
    })
    if (!guessed) {
      throw new NotFoundException(`Personagem "${guess}" não encontrado`)
    }

    const attemptNumber = play.attemptsCount + 1
    const isCorrect = guessed.id === target.id

    const attempt = await this.prisma.attempt.create({
      data: {
        ...ownerFilter,
        targetCharacterId: target.id,
        guessedCharacterId: guessed.id,
        modeConfigId: play.modeConfigId,
        guess: guess.trim(),
        isCorrect,
        playId,
      },
    })

    await this.prisma.play.update({
      where: { id: playId },
      data: {
        attemptsCount: { increment: 1 },
        ...(isCorrect ? { completed: true } : {}),
      },
    })

    await this.statsSnapshot.syncDay()

    let comparison: GuessResult['comparison'] = {}
    switch (mode) {
      case 'Descrição':
        comparison = {
          descrição: {
            guessed: guessed.description ?? '',
            target: target.description ?? '',
          },
        }
        break

      case 'Emoji':
        comparison = {
          emojis: {
            guessed: guessed.emojis,
            target: target.emojis,
          },
        }
        break

      case 'Imagem':
        comparison = {
          imagem: {
            guessed: guessed.imageUrl1 ?? '',
            target: target.imageUrl1 ?? '',
          },
        }
        break

      default:
        comparison = {
          gênero:       { guessed: guessed.gender,       target: target.gender },
          raça:         { guessed: guessed.race,         target: target.race },
          etnia:        { guessed: guessed.ethnicity,    target: target.ethnicity },
          cabelo:       { guessed: guessed.hair,         target: target.hair },
          status:       { guessed: guessed.aliveStatus,  target: target.aliveStatus },
          franchises:   {
            guessed: guessed.franchises.map(cf => cf.franchise.name),
            target:  target.franchises.map(cf => cf.franchise.name),
          },
        }
        break
    }

    return {
      attemptNumber,
      guess: attempt.guess,
      isCorrect,
      playCompleted: isCorrect,
      guessedImageUrl1: guessed.imageUrl1 ?? null,
      comparison,
      triedAt: attempt.createdAt,
    }
  }

  async getAttemptsByPlay(
    userId: number | undefined,
    playId: number,
  ): Promise<GuessResult[]> {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: { modeConfig: { select: { name: true } } },
    })
    if (!play) {
      throw new NotFoundException('Partida não encontrada')
    }

    const mode = play.modeConfig.name
    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! }

    const atts = await this.prisma.attempt.findMany({
      where: { ...ownerFilter, playId },
      include: {
        targetCharacter:  { include: { franchises: { include: { franchise: true } } } },
        guessedCharacter: { include: { franchises: { include: { franchise: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return atts.map((a, idx) => {
      const tgt = a.targetCharacter
      const gss = a.guessedCharacter!
      let comparison: GuessResult['comparison'] = {}

      switch (mode) {
        case 'Descrição':
          comparison = {
            descrição: {
              guessed: gss.description ?? '',
              target: tgt.description ?? '',
            },
          }
          break

        case 'Emoji':
          comparison = {
            emojis: {
              guessed: gss.emojis,
              target: tgt.emojis,
            },
          }
          break

        case 'Imagem':
          comparison = {
            imagem: {
              guessed: gss.imageUrl1 ?? '',
              target: tgt.imageUrl1 ?? '',
            },
          }
          break

        default:
          comparison = {
            gênero: {
              guessed: gss.gender,
              target: tgt.gender,
            },
            raça: {
              guessed: gss.race,
              target: tgt.race,
            },
            etnia: {
              guessed: gss.ethnicity,
              target: tgt.ethnicity,
            },
            cabelo: {
              guessed: gss.hair,
              target: tgt.hair,
            },
            status: {
              guessed: gss.aliveStatus,
              target: tgt.aliveStatus,
            },
            franchises: {
              guessed: gss.franchises.map(cf => cf.franchise.name),
              target: tgt.franchises.map(cf => cf.franchise.name),
            },
          }
          break
      }

      return {
        attemptNumber:   idx + 1,
        guess:           a.guess,
        isCorrect:       a.isCorrect,
        playCompleted:   a.isCorrect,
        guessedImageUrl1: gss.imageUrl1 ?? null,
        comparison,
        triedAt:         a.createdAt,
      }
    })
  }
}
