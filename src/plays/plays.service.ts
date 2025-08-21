import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatsSnapshotService } from '../stats/stats-snapshot.service';
import {
  fortalezaDayStart,
  fortalezaDayStartFromYYYYMMDD,
} from '../../utils/dayStart';
import { Prisma } from '@prisma/client';

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
  comparison: Record<string, Comparison<string> | Comparison<string[]>>;
  triedAt: Date;
}

@Injectable()
export class PlaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsSnapshot: StatsSnapshotService,
  ) { }

  private getDayStart(date?: string): Date {
    return date ? fortalezaDayStartFromYYYYMMDD(date) : fortalezaDayStart();
  }

  private toStartResponse(full: any) {
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

  private buildComparison(mode: string, gss: any, tgt: any): GuessResult['comparison'] {
    switch (mode) {
      case 'Descrição':
        return { descrição: { guessed: gss.description ?? '', target: tgt.description ?? '' } };
      case 'Emoji':
      case 'Emojis':
        return { emojis: { guessed: gss.emojis, target: tgt.emojis } };
      case 'Imagem':
        return { imagem: { guessed: gss.imageUrl2 ?? '', target: tgt.imageUrl2 ?? '' } };
      default:
        return {
          gênero: { guessed: gss.gender, target: tgt.gender },
          raça: { guessed: gss.race, target: tgt.race },
          etnia: { guessed: gss.ethnicity, target: tgt.ethnicity },
          cabelo: { guessed: gss.hair, target: tgt.hair },
          status: { guessed: gss.aliveStatus, target: tgt.aliveStatus },
          franchises: {
            guessed: gss.franchises?.map((cf: any) => cf.franchise.name) ?? [],
            target: tgt.franchises?.map((cf: any) => cf.franchise.name) ?? [],
          },
        };
    }
  }

  async startPlayAsGuest(modeConfigId: number, date?: string, guestId?: string) {
    if (!modeConfigId || Number.isNaN(+modeConfigId)) {
      throw new BadRequestException('modeConfigId inválido');
    }
    if (!guestId) {
      throw new BadRequestException('X-Guest-Id é obrigatório');
    }

    const dayStart = this.getDayStart(date);

    const sel = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId, date: dayStart, latest: true },
      orderBy: { id: 'desc' },
      include: { character: true, modeConfig: true },
    });
    if (!sel) throw new NotFoundException('Nenhum personagem selecionado neste dia');

    const play = await this.prisma.play.upsert({
      where: {
        guestId_modeConfigId_selectionDate_characterId: {
          guestId,
          modeConfigId,
          selectionDate: dayStart,
          characterId: sel.characterId,
        },
      },
      create: {
        guestId,
        modeConfigId,
        characterId: sel.characterId,
        selectionDate: dayStart,
      },
      update: {},
      include: { character: true, modeConfig: true },
    });

    try { await this.statsSnapshot.syncDay(); } catch { }

    return { ...this.toStartResponse(play), guestId };
  }

  async makeGuestGuess(
    playId: number,
    guess: string,
    guestId: string,
  ): Promise<GuessResult> {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: {
        modeConfig: { select: { name: true } },
        character: { include: { franchises: { include: { franchise: true } } } },
      },
    });
    if (!play) throw new NotFoundException('Partida não encontrada');
    if (play.completed) throw new BadRequestException('Partida já concluída');
    if (!play.guestId || play.guestId !== guestId) {
      throw new UnauthorizedException('Esta partida pertence a outro convidado.');
    }

    const mode = play.modeConfig.name;
    const target = play.character;

    const trimmed = (guess ?? '').trim();
    if (!trimmed) throw new BadRequestException('Informe um personagem.');

    const already = await this.prisma.attempt.findFirst({
      where: { playId, guess: trimmed }, // <- alinha com UNIQUE (playId, guess)
    });
    if (already) throw new BadRequestException('Você já chutou esse personagem nesta partida');

    const guessed = await this.prisma.character.findUnique({
      where: { name: trimmed },
      include: { franchises: { include: { franchise: true } } },
    });
    if (!guessed) throw new NotFoundException(`Personagem "${guess}" não encontrado`);

    const isCorrect = guessed.id === target.id;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.play.update({
          where: { id: playId },
          data: {
            attemptsCount: { increment: 1 },
            ...(isCorrect ? { completed: true, completedAt: new Date() } : {}),
          },
          select: { attemptsCount: true },
        });

        const attempt = await tx.attempt.create({
          data: {
            guestId,
            targetCharacterId: target.id,
            guessedCharacterId: guessed.id,
            modeConfigId: play.modeConfigId,
            guess: trimmed,
            isCorrect,
            playId,
            order: updated.attemptsCount,
          },
        });

        return attempt;
      });

      try { await this.statsSnapshot.syncDay(); } catch { }

      const comparison = this.buildComparison(mode, guessed, target);

      return {
        attemptNumber: result.order,
        guess: result.guess,
        isCorrect,
        playCompleted: isCorrect,
        guessedImageUrl1:
          mode === 'Imagem' ? (guessed.imageUrl2 ?? null) : (guessed.imageUrl1 ?? null),
        comparison,
        triedAt: result.createdAt,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return Promise.reject(
          new BadRequestException('Você já chutou esse personagem nesta partida')
        );
      }
      throw e;
    }
  }

  async getDailyProgressAsGuest(modeConfigId: number, guestId: string) {
    const today = this.getDayStart();

    const latestSelection = await this.prisma.dailySelection.findFirst({
      where: { modeConfigId, date: today, latest: true },
      orderBy: { id: 'desc' },
    });
    if (!latestSelection) return { alreadyPlayed: false };

    const play = await this.prisma.play.findFirst({
      where: {
        modeConfigId,
        characterId: latestSelection.characterId,
        selectionDate: today,
        guestId,
      },
      include: {
        modeConfig: { select: { name: true } },
        character: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!play) return { alreadyPlayed: false };

    const atts = await this.prisma.attempt.findMany({
      where: { playId: play.id, guestId },
      include: {
        targetCharacter: { include: { franchises: { include: { franchise: true } } } },
        guessedCharacter: { include: { franchises: { include: { franchise: true } } } },
      },
      orderBy: { order: 'asc' },
    });

    const mode = play.modeConfig.name;
    const attempts = atts.map((a) => {
      const tgt = a.targetCharacter;
      const gss = a.guessedCharacter!;
      const comparison = this.buildComparison(mode, gss, tgt);

      return {
        attemptNumber: a.order!,
        guess: a.guess,
        isCorrect: a.isCorrect,
        playCompleted: a.isCorrect,
        guessedImageUrl1:
          mode === 'Imagem' ? (gss.imageUrl2 ?? null) : (gss.imageUrl1 ?? null),
        comparison,
        triedAt: a.createdAt,
      };
    });

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
    };
  }

  async getGuestProgressByPlayId(playId: number, guestId: string) {
    const play = await this.prisma.play.findUnique({
      where: { id: playId },
      include: {
        modeConfig: { select: { name: true } },
        character: true,
      },
    });
    if (!play) throw new NotFoundException('Partida não encontrada');
    if (!play.guestId || play.guestId !== guestId) {
      throw new UnauthorizedException('Esta partida pertence a outro convidado.');
    }

    const atts = await this.prisma.attempt.findMany({
      where: { playId, guestId },
      include: {
        targetCharacter: { include: { franchises: { include: { franchise: true } } } },
        guessedCharacter: { include: { franchises: { include: { franchise: true } } } },
      },
      orderBy: { order: 'asc' },
    });

    const mode = play.modeConfig.name;

    const attempts = atts.map((a) => {
      const tgt = a.targetCharacter;
      const gss = a.guessedCharacter!;
      const comparison = this.buildComparison(mode, gss, tgt);

      return {
        attemptNumber: a.order!,
        guess: a.guess,
        isCorrect: a.isCorrect,
        playCompleted: a.isCorrect,
        guessedImageUrl1:
          mode === 'Imagem' ? (gss.imageUrl2 ?? null) : (gss.imageUrl1 ?? null),
        comparison,
        triedAt: a.createdAt,
      };
    });

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
    };
  }

  async getGuestAttemptsByPlay(playId: number, guestId: string) {
    const progress = await this.getGuestProgressByPlayId(playId, guestId);
    return progress.attempts;
  }
}
