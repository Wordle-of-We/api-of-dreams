import { Module } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';

@Module({
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
