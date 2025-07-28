import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService }             from '../../prisma/prisma.service';
import { v4 as uuidv4 }              from 'uuid';

export interface Comparison<T> {
  guessed: T;
  target:  T;
}

export interface GuessResult {
  guess:       string;
  isCorrect:   boolean;
  comparison:  {
    gender:        Comparison<string>;
    race:          Comparison<string[]>;
    ethnicity:     Comparison<string[]>;
    hair:           Comparison<string>;
    aliveStatus:   Comparison<string>;
    isProtagonist: Comparison<boolean>;
    franchises:    Comparison<string[]>;
  };
  triedAt:     Date;
}

@Injectable()
export class PlaysService {
  constructor(private readonly prisma: PrismaService) {}

  async startPlay(userId: number | undefined, modeConfigId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (userId) {
      const existing = await this.prisma.play.findFirst({
        where: {
          userId,
          modeConfigId,
          createdAt: { gte: today },
        },
      });
      if (existing) {
        return { playId: existing.id };
      }
    }

    const guestId = userId ? null : uuidv4();

    const selection = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId },
      orderBy: { date: 'desc' },
    });
    if (!selection) throw new NotFoundException('Nenhum personagem selecionado hoje');

    const play = await this.prisma.play.create({
      data: {
        userId:      userId ?? undefined,
        guestId:     guestId ?? undefined,
        modeConfigId,
        characterId: selection.characterId,
      },
    });

    return userId
      ? { playId: play.id }
      : { playId: play.id, guestId };
  }

  async makeGuess(
    userId:  number | undefined,
    playId:  number,
    guess:   string,
  ): Promise<GuessResult> {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: {
        character: { include: { franchises: { include: { franchise: true } } } },
      },
    });
    if (!play) throw new NotFoundException('Partida não encontrada');
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
    if (!guessed) throw new NotFoundException(`Personagem "${guess}" não encontrado`);

    const isCorrect = guessed.id === target.id;

    const attempt = await this.prisma.attempt.create({
      data: {
        ...ownerFilter,
        targetCharacterId:  target.id,
        guessedCharacterId: guessed.id,
        modeConfigId:       play.modeConfigId,
        guess:              guess.trim(),
        isCorrect,
      },
    });

    await this.prisma.play.update({
      where: { id: playId },
      data: { attemptsCount: { increment: 1 } },
    });

    const franchisesTarget  = target.franchises.map(cf => cf.franchise.name);
    const franchisesGuessed = guessed.franchises.map(cf => cf.franchise.name);

    const comparison = {
      gender:        { guessed: guessed.gender,        target: target.gender },
      race:          { guessed: guessed.race,          target: target.race },
      ethnicity:     { guessed: guessed.ethnicity,     target: target.ethnicity },
      hair:          { guessed: guessed.hair,          target: target.hair },
      aliveStatus:   { guessed: guessed.aliveStatus,   target: target.aliveStatus },
      isProtagonist: { guessed: guessed.paper ?? false, target: target.paper ?? false },
      franchises:    { guessed: franchisesGuessed,      target: franchisesTarget },
    };

    return {
      guess:      attempt.guess,
      isCorrect,
      comparison,
      triedAt:    attempt.createdAt,
    };
  }

  async getAttemptsByPlay(
    userId:  number | undefined,
    playId:  number,
  ): Promise<GuessResult[]> {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
    });
    if (!play) throw new NotFoundException('Partida não encontrada');

    const ownerFilter = play.userId
      ? { userId: play.userId }
      : { guestId: play.guestId! };

    const attempts = await this.prisma.attempt.findMany({
      where: {
        ...ownerFilter,
        targetCharacterId: play.characterId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        targetCharacter: {
          include: { franchises: { include: { franchise: true } } },
        },
        guessedCharacter: {
          include: { franchises: { include: { franchise: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return attempts.map((a) => {
      const tgt = a.targetCharacter;
      const gss = a.guessedCharacter!;
      const franchisesTarget  = tgt.franchises.map(cf => cf.franchise.name);
      const franchisesGuessed = gss.franchises.map(cf => cf.franchise.name);

      const comparison = {
        gender:        { guessed: gss.gender,      target: tgt.gender },
        race:          { guessed: gss.race,        target: tgt.race },
        ethnicity:     { guessed: gss.ethnicity,   target: tgt.ethnicity },
        hair:          { guessed: gss.hair,        target: tgt.hair },
        aliveStatus:   { guessed: gss.aliveStatus, target: tgt.aliveStatus },
        isProtagonist: { guessed: gss.paper ?? false, target: tgt.paper ?? false },
        franchises:    { guessed: franchisesGuessed,   target: franchisesTarget },
      };

      return {
        guess:      a.guess,
        isCorrect:  a.isCorrect,
        comparison,
        triedAt:    a.createdAt,
      };
    });
  }
}
