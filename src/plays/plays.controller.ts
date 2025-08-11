import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PlaysService } from './plays.service';
import { StartPlayDto } from './dto/start-play.dto';
import { GuessDto } from './dto/create-play.dto';

@Controller('plays')
export class PlaysController {
  constructor(private readonly playsService: PlaysService) {}

  @Post('start')
  async start(
    @Body() dto: StartPlayDto,
    @Headers('x-guest-id') guestId?: string,
  ) {
    if (!dto?.modeConfigId || Number.isNaN(+dto.modeConfigId)) {
      throw new BadRequestException('modeConfigId é obrigatório e deve ser número');
    }
    return this.playsService.startPlayAsGuest(dto.modeConfigId, dto.date, guestId);
  }

  @Get('progress/:modeConfigId')
  async getProgress(
    @Param('modeConfigId', ParseIntPipe) modeConfigId: number,
    @Headers('x-guest-id') guestId?: string,
  ) {
    if (!guestId) return { alreadyPlayed: false };
    return this.playsService.getDailyProgressAsGuest(modeConfigId, guestId);
  }

  @Post(':playId/guess')
  async guess(
    @Param('playId', ParseIntPipe) playId: number,
    @Body() dto: GuessDto,
    @Headers('x-guest-id') guestId?: string,
  ) {
    if (!guestId) {
      throw new BadRequestException('X-Guest-Id é obrigatório para chutar.');
    }
    return this.playsService.makeGuestGuess(playId, dto.guess, guestId);
  }

  @Get(':playId/attempts')
  async listAttempts(
    @Param('playId', ParseIntPipe) playId: number,
    @Headers('x-guest-id') guestId?: string,
  ) {
    if (!guestId) {
      throw new BadRequestException('X-Guest-Id é obrigatório.');
    }
    return this.playsService.getGuestAttemptsByPlay(playId, guestId);
  }

  @Get(':playId/progress')
  async getPlayProgress(
    @Param('playId', ParseIntPipe) playId: number,
    @Headers('x-guest-id') guestId?: string,
  ) {
    if (!guestId) {
      throw new BadRequestException('X-Guest-Id é obrigatório.');
    }
    return this.playsService.getGuestProgressByPlayId(playId, guestId);
  }
}
