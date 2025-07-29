import { Module } from '@nestjs/common';
import { GameModeService } from './game-mode.service';
import { GameModeController } from './game-mode.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GameModeController],
  providers: [GameModeService],
})
export class GameModeModule {}
