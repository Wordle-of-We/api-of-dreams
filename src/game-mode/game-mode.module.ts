import { Module } from '@nestjs/common';
import { GameModeService } from './game-mode.service';
import { GameModeController } from './game-mode.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { DailySelectionModule } from 'src/daily-selection/daily-selection.module';

@Module({
  imports: [PrismaModule, AuthModule,  DailySelectionModule],
  controllers: [GameModeController],
  providers: [GameModeService],
})
export class GameModeModule {}
