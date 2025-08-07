import { Controller, Get, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { OverviewStatsDto } from './dto/overview-stats.dto';
import { ModeStatsDto } from './dto/mode-stats.dto';
import { PlayStatsDto } from './dto/play-stats.dto';
import { JwtAuthGuard } from '../../src/auth/guard/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) { }

  @Get('overview')
  overview(@Query('date') date?: string): Promise<OverviewStatsDto> {
    return this.svc.getOverview(date);
  }

  @Get('mode/:modeId')
  modeStats(
    @Param('modeId', ParseIntPipe) modeId: number,
    @Query('date') date?: string,
  ): Promise<ModeStatsDto> {
    return this.svc.getModeStats(modeId, date);
  }

  @Get('play/:playId')
  playStats(
    @Param('playId', ParseIntPipe) playId: number,
  ): Promise<PlayStatsDto> {
    return this.svc.getPlayStats(playId);
  }
}
