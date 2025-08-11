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
  ) { }

  private dayStartFromYYYYMMDD(date?: string): Date {
    if (!date) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return new Date(`${date}T00:00:00-03:00`);
  }

  async startPlay(
    userId: number | undefined,
    modeConfigId: number,
    date?: string,
  ) {
    const dayStart = this.dayStartFromYYYYMMDD(date);

    if (userId) {
      const existing = await this.prisma.play.findFirst({
        where: {
          userId,
          modeConfigId,
          selectionDate: dayStart,
        },
      });
      if (existing) {
        const full = await this.prisma.play.findUnique({
          where: { id: existing.id },
          include: { character: true, modeConfig: true },
        });
        if (!full) throw new NotFoundException('Partida não encontrada');
        return {
          playId: full.id,
          completed: full.completed,
          attemptsCount: full.attemptsCount,
          character: {
            id: full.character.id,
            name: full.character.name,
            description: full.character.description,
            imageUrl1: full.character.imageUrl1,
            imageUrl2: full.character.imageUrl2,
            emojis: full.character.emojis,
          },
          modeConfig: {
            id: full.modeConfig.id,
            name: full.modeConfig.name,
            imageUseSecondImage: (full.modeConfig as any).imageUseSecondImage,
            imageBlurStart: (full.modeConfig as any).imageBlurStart,
            imageBlurStep: (full.modeConfig as any).imageBlurStep,
            imageBlurMin: (full.modeConfig as any).imageBlurMin,
          },
        };
      }
    }

    const sel = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId, date: dayStart, latest: true },
      orderBy: { id: 'desc' },
      include: { character: true, modeConfig: true },
    });
    if (!sel) throw new NotFoundException('Nenhum personagem selecionado neste dia');

    const guestId = userId ? null : uuidv4();
    const play = await this.prisma.play.create({
      data: {
        userId,
        guestId,
        modeConfigId,
        characterId: sel.characterId,
        selectionDate: dayStart,
      },
    });

    await this.statsSnapshot.syncDay();

    const base = {
      playId: play.id,
      completed: play.completed,
      attemptsCount: play.attemptsCount,
      character: {
        id: sel.character.id,
        name: sel.character.name,
        description: sel.character.description,
        imageUrl1: sel.character.imageUrl1,
        imageUrl2: sel.character.imageUrl2,
        emojis: sel.character.emojis,
      },
      modeConfig: {
        id: sel.modeConfig.id,
        name: sel.modeConfig.name,
        imageUseSecondImage: (sel.modeConfig as any).imageUseSecondImage,
        imageBlurStart: (sel.modeConfig as any).imageBlurStart,
        imageBlurStep: (sel.modeConfig as any).imageBlurStep,
        imageBlurMin: (sel.modeConfig as any).imageBlurMin,
      },
    };

    return userId ? base : { ...base, guestId };
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
    if (!play) throw new NotFoundException('Partida não encontrada')
    if (play.completed) throw new BadRequestException('Partida já concluída')

    const mode = play.modeConfig.name
    const target = play.character
    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! }

    const already = await this.prisma.attempt.findFirst({
      where: {
        ...ownerFilter,
        modeConfigId: play.modeConfigId,
        playId: playId,
        guess: guess.trim(),
      },
    })
    if (already) {
      throw new BadRequestException('Você já chutou esse personagem nesta partida')
    }

    const guessed = await this.prisma.character.findUnique({
      where: { name: guess.trim() },
      include: { franchises: { include: { franchise: true } } },
    })
    if (!guessed) {
      throw new NotFoundException(`Personagem "${guess}" não encontrado`)
    }

    const prevCount = await this.prisma.attempt.count({
      where: { ...ownerFilter, playId },
    })

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
        order: prevCount + 1,
      },
    })

    await this.prisma.play.update({
      where: { id: playId },
      data: {
        attemptsCount: { increment: 1 },
        ...(isCorrect ? { completed: true, completedAt: new Date() } : {}),
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
      case 'Emoji': // compat: se algum modo antigo usar "Emoji" no singular
      case 'Emojis':
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
            guessed: guessed.imageUrl2 ?? '',
            target: target.imageUrl2 ?? '',
          },
        }
        break
      default:
        comparison = {
          gênero: { guessed: guessed.gender, target: target.gender },
          raça: { guessed: guessed.race, target: target.race },
          etnia: { guessed: guessed.ethnicity, target: target.ethnicity },
          cabelo: { guessed: guessed.hair, target: target.hair },
          status: { guessed: guessed.aliveStatus, target: target.aliveStatus },
          franchises: {
            guessed: guessed.franchises.map(cf => cf.franchise.name),
            target: target.franchises.map(cf => cf.franchise.name),
          },
        }
        break
    }

    return {
      attemptNumber: prevCount + 1,
      guess: attempt.guess,
      isCorrect,
      playCompleted: isCorrect,
      // usa image 2 no modo Imagem
      guessedImageUrl1:
        mode === 'Imagem' ? (guessed.imageUrl2 ?? null) : (guessed.imageUrl1 ?? null),
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
    if (!play) throw new NotFoundException('Partida não encontrada')

    const mode = play.modeConfig.name
    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! }

    const atts = await this.prisma.attempt.findMany({
      where: { ...ownerFilter, playId },
      include: {
        targetCharacter: { include: { franchises: { include: { franchise: true } } } },
        guessedCharacter: { include: { franchises: { include: { franchise: true } } } },
      },
      orderBy: { order: 'asc' },
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
        case 'Emojis':
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
              guessed: gss.imageUrl2 ?? '',
              target: tgt.imageUrl2 ?? '',
            },
          }
          break
        default:
          comparison = {
            gênero: { guessed: gss.gender, target: tgt.gender },
            raça: { guessed: gss.race, target: tgt.race },
            etnia: { guessed: gss.ethnicity, target: tgt.ethnicity },
            cabelo: { guessed: gss.hair, target: tgt.hair },
            status: { guessed: gss.aliveStatus, target: tgt.aliveStatus },
            franchises: {
              guessed: gss.franchises.map(cf => cf.franchise.name),
              target: tgt.franchises.map(cf => cf.franchise.name),
            },
          }
          break
      }

      return {
        attemptNumber: idx + 1,
        guess: a.guess,
        isCorrect: a.isCorrect,
        playCompleted: a.isCorrect,
        guessedImageUrl1:
          mode === 'Imagem' ? (gss.imageUrl2 ?? null) : (gss.imageUrl1 ?? null),
        comparison,
        triedAt: a.createdAt,
      }
    })
  }

  async getDailyProgress(userId: number | undefined, modeConfigId: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const latestSelection = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId, date: today },
      orderBy: { id: 'desc' },
    })

    if (!latestSelection) {
      return { alreadyPlayed: false }
    }

    const play = await this.prisma.play.findFirst({
      where: {
        modeConfigId,
        characterId: latestSelection.characterId,
        createdAt: { gte: today },
        ...(userId ? { userId } : {}),
      },
      include: {
        modeConfig: { select: { name: true } },
        character: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!play) {
      return { alreadyPlayed: false }
    }

    const atts = await this.prisma.attempt.findMany({
      where: {
        playId: play.id,
        ...(userId ? { userId } : { guestId: play.guestId! }),
      },
      include: {
        targetCharacter: { include: { franchises: { include: { franchise: true } } } },
        guessedCharacter: { include: { franchises: { include: { franchise: true } } } },
      },
      orderBy: { order: 'asc' },
    })

    const mode = play.modeConfig.name
    const attempts = atts.map(a => {
      const tgt = a.targetCharacter
      const gss = a.guessedCharacter!
      let comparison: GuessResult['comparison'] = {}

      switch (mode) {
        case 'Descrição':
          comparison = {
            descrição: { guessed: gss.description ?? '', target: tgt.description ?? '' },
          }
          break
        case 'Emoji':
        case 'Emojis':
          comparison = {
            emojis: { guessed: gss.emojis, target: tgt.emojis },
          }
          break
        case 'Imagem':
          comparison = {
            imagem: { guessed: gss.imageUrl2 ?? '', target: tgt.imageUrl2 ?? '' },
          }
          break
        default:
          comparison = {
            gênero: { guessed: gss.gender, target: tgt.gender },
            raça: { guessed: gss.race, target: tgt.race },
            etnia: { guessed: gss.ethnicity, target: tgt.ethnicity },
            cabelo: { guessed: gss.hair, target: tgt.hair },
            status: { guessed: gss.aliveStatus, target: tgt.aliveStatus },
            franchises: {
              guessed: gss.franchises.map(f => f.franchise.name),
              target: tgt.franchises.map(f => f.franchise.name),
            },
          }
      }

      return {
        attemptNumber: a.order!,
        guess: a.guess,
        isCorrect: a.isCorrect,
        playCompleted: a.isCorrect,
        guessedImageUrl1:
          mode === 'Imagem' ? (gss.imageUrl2 ?? null) : (gss.imageUrl1 ?? null),
        comparison,
        triedAt: a.createdAt,
      }
    })

    return {
      alreadyPlayed: true,
      playId: play.id,
      completed: play.completed,
      character: {
        id: play.character.id,
        name: play.character.name,
        description: play.character.description,
        imageUrl1: play.character.imageUrl1,
        imageUrl2: play.character.imageUrl2,
      },
      attempts,
    }
  }

  async getProgressByPlayId(userId: number | undefined, playId: number) {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: {
        modeConfig: { select: { name: true } },
        character: true,
      },
    })

    if (!play) throw new NotFoundException('Partida não encontrada')

    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! }

    const atts = await this.prisma.attempt.findMany({
      where: {
        playId,
        ...ownerFilter,
      },
      include: {
        targetCharacter: { include: { franchises: { include: { franchise: true } } } },
        guessedCharacter: { include: { franchises: { include: { franchise: true } } } },
      },
      orderBy: { order: 'asc' },
    })

    const mode = play.modeConfig.name

    const attempts = atts.map((a) => {
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
        case 'Emojis':
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
              guessed: gss.imageUrl2 ?? '',
              target: tgt.imageUrl2 ?? '',
            },
          }
          break
        default:
          comparison = {
            gênero: { guessed: gss.gender, target: tgt.gender },
            raça: { guessed: gss.race, target: tgt.race },
            etnia: { guessed: gss.ethnicity, target: tgt.ethnicity },
            cabelo: { guessed: gss.hair, target: tgt.hair },
            status: { guessed: gss.aliveStatus, target: tgt.aliveStatus },
            franchises: {
              guessed: gss.franchises.map(f => f.franchise.name),
              target: tgt.franchises.map(f => f.franchise.name),
            },
          }
      }

      return {
        attemptNumber: a.order!,
        guess: a.guess,
        isCorrect: a.isCorrect,
        playCompleted: a.isCorrect,
        guessedImageUrl1:
          mode === 'Imagem' ? (gss.imageUrl2 ?? null) : (gss.imageUrl1 ?? null),
        comparison,
        triedAt: a.createdAt,
      }
    })

    return {
      playId: play.id,
      completed: play.completed,
      character: {
        id: play.character.id,
        name: play.character.name,
        description: play.character.description,
        imageUrl1: play.character.imageUrl1,
        imageUrl2: play.character.imageUrl2,
        emojis: play.character.emojis,
      },
      attempts,
    }
  }
}
