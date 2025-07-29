// src/plays/plays.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PlaysService } from './plays.service';
import { StartPlayDto } from './dto/start-play.dto';
import { GuessDto } from './dto/create-play.dto';
import { OptionalAuthGuard } from '../auth/guard/optional-auth.guard';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { userId: number; email?: string };
}

@Controller('plays')
export class PlaysController {
  constructor(private readonly playsService: PlaysService) { }

  @Post('start')
  @UseGuards(OptionalAuthGuard)
  async start(
    @Req() req: RequestWithUser,
    @Body() dto: StartPlayDto,
  ) {
    const userId = req.user?.userId;
    return this.playsService.startPlay(userId, dto.modeConfigId);
  }

  @Post(':playId/guess')
  @UseGuards(OptionalAuthGuard)
  async guess(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
    @Body() dto: GuessDto,
  ) {
    const userId = req.user?.userId;
    return this.playsService.makeGuess(userId, playId, dto.guess);
  }

  @Get(':playId/attempts')
  @UseGuards(OptionalAuthGuard)
  async listAttempts(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
  ) {
    const userId = req.user?.userId;
    return this.playsService.getAttemptsByPlay(userId, playId);
  }
}
