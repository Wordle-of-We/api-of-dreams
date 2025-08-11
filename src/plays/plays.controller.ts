import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  ParseIntPipe,
  UseGuards,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { PlaysService } from './plays.service';
import { StartPlayDto } from './dto/start-play.dto';
import { GuessDto } from './dto/create-play.dto';
import { OptionalAuthGuard } from '../auth/guard/optional-auth.guard';

interface RequestWithUser extends Request {
  user?: { userId: number; email?: string };
}

@Controller('plays')
export class PlaysController {
  constructor(private readonly playsService: PlaysService) {}

  @Post('start')
  @UseGuards(OptionalAuthGuard)
  async start(
    @Req() req: RequestWithUser,
    @Body() dto: StartPlayDto,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.playsService.startPlay(
      req.user?.userId,
      dto.modeConfigId,
      dto.date,
      guestId,
    );
  }

  @Get('progress/:modeConfigId')
  @UseGuards(OptionalAuthGuard)
  async getProgress(
    @Req() req: RequestWithUser,
    @Param('modeConfigId', ParseIntPipe) modeConfigId: number,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.playsService.getDailyProgress(
      req.user?.userId,
      modeConfigId,
      guestId,
    );
  }

  // Opcional (recomendado): reforçar propriedade também em convidados
  @Post(':playId/guess')
  @UseGuards(OptionalAuthGuard)
  async guess(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
    @Body() dto: GuessDto,
    @Headers('x-guest-id') guestId?: string,
  ) {
    // Se quiser validar guestId no service, adicione o parâmetro lá e passe aqui
    return this.playsService.makeGuess(req.user?.userId, playId, dto.guess /*, guestId*/);
  }

  @Get(':playId/attempts')
  @UseGuards(OptionalAuthGuard)
  async listAttempts(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.playsService.getAttemptsByPlay(req.user?.userId, playId /*, guestId*/);
  }

  @Get(':playId/progress')
  @UseGuards(OptionalAuthGuard)
  async getPlayProgress(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.playsService.getProgressByPlayId(req.user?.userId, playId /*, guestId*/);
  }
}
