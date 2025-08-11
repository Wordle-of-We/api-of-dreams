import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly svc: LeaderboardService) {}

  @Get('daily')
  async daily(
    @Query('modeId') modeId?: string,
    @Query('date') date?: string,
  ) {
    const d = date ? new Date(date) : new Date();
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.getDailyRanking(d, m);
  }

  @Get('lifetime')
  async lifetime(@Query('modeId') modeId?: string) {
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.getLifetimeRanking(m);
  }
}
