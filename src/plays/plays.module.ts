import { Module } from '@nestjs/common';
import { PlaysController } from './plays.controller';
import { PlaysService }    from './plays.service';
import { PrismaModule }    from '../../prisma/prisma.module';
import { AuthModule }      from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [PlaysController],
  providers:   [PlaysService],
})
export class PlaysModule {}
