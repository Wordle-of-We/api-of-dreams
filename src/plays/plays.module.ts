import { Module } from '@nestjs/common';
import { PlaysService } from './plays.service';
import { PlaysController } from './plays.controller';

@Module({
  controllers: [PlaysController],
  providers: [PlaysService],
})
export class PlaysModule {}
