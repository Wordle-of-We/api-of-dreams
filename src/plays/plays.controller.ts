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
import type { Request } from 'express';
import { GuessResult, PlaysService } from './plays.service';
import { StartPlayDto } from './dto/start-play.dto';
import { GuessDto } from './dto/create-play.dto';
import { OptionalAuthGuard } from '../auth/guard/optional-auth.guard';
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
    return this.playsService.startPlay(req.user?.userId, dto.modeConfigId, dto.date);
  }

  @Post(':playId/guess')
  @UseGuards(OptionalAuthGuard)
  async guess(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
    @Body() dto: GuessDto,
  ): Promise<GuessResult> {
    return this.playsService.makeGuess(req.user?.userId, playId, dto.guess);
  }

  @Get(':playId/attempts')
  @UseGuards(OptionalAuthGuard)
  async listAttempts(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
  ) {
    return this.playsService.getAttemptsByPlay(req.user?.userId, playId);
  }

  @Get('progress/:modeConfigId')
  @UseGuards(OptionalAuthGuard)
  async getProgress(
    @Req() req: RequestWithUser,
    @Param('modeConfigId', ParseIntPipe) modeConfigId: number,
  ) {
    return this.playsService.getDailyProgress(req.user?.userId, modeConfigId);
  }

  @Get(':playId/progress')
  @UseGuards(OptionalAuthGuard)
  async getPlayProgress(
    @Req() req: RequestWithUser,
    @Param('playId', ParseIntPipe) playId: number,
  ) {
    return this.playsService.getProgressByPlayId(req.user?.userId, playId);
  }
}
