import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PlaysService } from './plays.service';
import { PlaysController } from './plays.controller';
import { StatsModule } from 'src/stats/stats.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    forwardRef(() => StatsModule),
  ],
  providers: [PlaysService],
  controllers: [PlaysController],
})
export class PlaysModule { }
