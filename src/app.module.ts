import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CharactersModule } from './characters/characters.module';
import { FranchisesModule } from './franchises/franchises.module';
import { DailySelectionModule } from './daily-selection/daily-selection.module';
import { PlaysModule } from './plays/plays.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AccessLogsModule } from './access-logs/access-logs.module';
import { StatsModule } from './stats/stats.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, CharactersModule, FranchisesModule, DailySelectionModule, PlaysModule, AttemptsModule, AccessLogsModule, StatsModule, ScheduleModule.forRoot(),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
