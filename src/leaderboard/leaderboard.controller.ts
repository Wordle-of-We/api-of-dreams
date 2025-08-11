import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../../src/auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly svc: LeaderboardService) {}

  @Get('daily')
  async daily(@Query('modeId') modeId?: string, @Query('date') date?: string) {
    const d = date ? new Date(date) : new Date();
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.getDailyRanking(d, m);
  }

  @Get('weekly')
  async weekly(@Query('modeId') modeId?: string, @Query('date') date?: string) {
    const d = date ? new Date(date) : new Date(); // qualquer dia da semana
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.getWeeklyRanking(d, m);
  }

  @Get('lifetime')
  async lifetime(@Query('modeId') modeId?: string) {
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.getLifetimeRanking(m);
  }

  @Post('rebuild/daily')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async rebuildDaily(@Query('modeId') modeId?: string, @Query('date') date?: string) {
    const d = date ? new Date(date) : new Date();
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.buildDailySnapshot(d, m);
  }

  @Post('rebuild/weekly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async rebuildWeekly(@Query('modeId') modeId?: string, @Query('date') date?: string) {
    const d = date ? new Date(date) : new Date();
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.buildWeeklySnapshot(d, m);
  }

  @Post('rebuild/lifetime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async rebuildAllTime(@Query('modeId') modeId?: string) {
    const m = modeId && !isNaN(+modeId) ? parseInt(modeId, 10) : undefined;
    return this.svc.buildAllTimeSnapshot(m);
  }
}
