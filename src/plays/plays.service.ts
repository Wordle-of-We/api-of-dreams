import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { StatsSnapshotService } from '../stats/stats-snapshot.service';

export interface Comparison<T> {
  guessed: T;
  target: T;
}

export interface GuessResult {
  attemptNumber: number;
  guess: string;
  isCorrect: boolean;
  playCompleted: boolean;
  guessedImageUrl1: string | null;
  comparison: {
    gender: Comparison<string>;
    race: Comparison<string[]>;
    ethnicity: Comparison<string[]>;
    hair: Comparison<string>;
    aliveStatus: Comparison<string>;
    isProtagonist: Comparison<boolean>;
    franchises: Comparison<string[]>;
  };
  triedAt: Date;
}

@Injectable()
export class PlaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsSnapshot: StatsSnapshotService,
  ) { }

  async startPlay(userId: number | undefined, modeConfigId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (userId) {
      const existing = await this.prisma.play.findFirst({
        where: { userId, modeConfigId, createdAt: { gte: today } },
      });
      if (existing) {
        return {
          playId: existing.id,
          completed: existing.completed,
          attemptsCount: existing.attemptsCount,
        };
      }
    }

    const guestId = userId ? null : uuidv4();
    const sel = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId },
      orderBy: { date: 'desc' },
    });
    if (!sel) {
      throw new NotFoundException('Nenhum personagem selecionado hoje');
    }

    const play = await this.prisma.play.create({
      data: {
        userId: userId ?? undefined,
        guestId: guestId ?? undefined,
        modeConfigId,
        characterId: sel.characterId,
      },
    });

    await this.statsSnapshot.syncDay();

    const base = {
      playId: play.id,
      completed: false,
      attemptsCount: 0,
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
        character: { include: { franchises: { include: { franchise: true } } } },
      },
    });
    if (!play) {
      throw new NotFoundException('Partida não encontrada');
    }
    if (play.completed) {
      throw new BadRequestException('Partida já concluída');
    }

    const target = play.character;
    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const already = await this.prisma.attempt.findFirst({
      where: {
        ...ownerFilter,
        modeConfigId: play.modeConfigId,
        targetCharacterId: target.id,
        guess: guess.trim(),
        createdAt: { gte: startOfDay },
      },
    });
    if (already) {
      throw new BadRequestException('Você já chutou esse personagem hoje neste modo');
    }

    const guessed = await this.prisma.character.findUnique({
      where: { name: guess.trim() },
      include: { franchises: { include: { franchise: true } } },
    });
    if (!guessed) {
      throw new NotFoundException(`Personagem "${guess}" não encontrado`);
    }

    const attemptNumber = play.attemptsCount + 1;
    const isCorrect = guessed.id === target.id;

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
    });

    await this.prisma.play.update({
      where: { id: playId },
      data: {
        attemptsCount: { increment: 1 },
        ...(isCorrect ? { completed: true } : {}),
      },
    });

    await this.statsSnapshot.syncDay();

    const targetFr = target.franchises.map(cf => cf.franchise.name);
    const guessedFr = guessed.franchises.map(cf => cf.franchise.name);
    const comparison = {
      gender: { guessed: guessed.gender, target: target.gender },
      race: { guessed: guessed.race, target: target.race },
      ethnicity: { guessed: guessed.ethnicity, target: target.ethnicity },
      hair: { guessed: guessed.hair, target: target.hair },
      aliveStatus: { guessed: guessed.aliveStatus, target: target.aliveStatus },
      isProtagonist: { guessed: guessed.paper ?? false, target: target.paper ?? false },
      franchises: { guessed: guessedFr, target: targetFr },
    };

    return {
      attemptNumber,
      guess: attempt.guess,
      isCorrect,
      playCompleted: isCorrect,
      guessedImageUrl1: guessed.imageUrl1 ?? null,
      comparison,
      triedAt: attempt.createdAt,
    };
  }

  async getAttemptsByPlay(
    userId: number | undefined,
    playId: number,
  ): Promise<GuessResult[]> {
    const play = await this.prisma.play.findUnique({ where: { id: playId } });
    if (!play) {
      throw new NotFoundException('Partida não encontrada');
    }

    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! };

    const attempts = await this.prisma.attempt.findMany({
      where: {
        ...ownerFilter,
        playId,
      },
      include: {
        targetCharacter: { include: { franchises: { include: { franchise: true } } } },
        guessedCharacter: { include: { franchises: { include: { franchise: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return attempts.map((a, idx) => {
      const tgt = a.targetCharacter;
      const gss = a.guessedCharacter!;
      const tgtFr = tgt.franchises.map(cf => cf.franchise.name);
      const gssFr = gss.franchises.map(cf => cf.franchise.name);

      const comparison = {
        gender: { guessed: gss.gender, target: tgt.gender },
        race: { guessed: gss.race, target: tgt.race },
        ethnicity: { guessed: gss.ethnicity, target: tgt.ethnicity },
        hair: { guessed: gss.hair, target: tgt.hair },
        aliveStatus: { guessed: gss.aliveStatus, target: tgt.aliveStatus },
        isProtagonist: { guessed: gss.paper ?? false, target: tgt.paper ?? false },
        franchises: { guessed: gssFr, target: tgtFr },
      };

      return {
        attemptNumber: idx + 1,
        guess: a.guess,
        isCorrect: a.isCorrect,
        playCompleted: a.isCorrect,
        guessedImageUrl1: gss.imageUrl1 ?? null,
        comparison,
        triedAt: a.createdAt,
      };
    });
  }
}
