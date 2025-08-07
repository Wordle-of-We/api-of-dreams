import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { DailySelectionModule } from '../daily-selection/daily-selection.module';
import { GameModeService } from './game-mode.service';
import { GameModeController } from './game-mode.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    DailySelectionModule,
    AuthModule
  ],
  providers: [GameModeService],
  controllers: [GameModeController],
  exports: [GameModeService],
})
export class GameModeModule {}
