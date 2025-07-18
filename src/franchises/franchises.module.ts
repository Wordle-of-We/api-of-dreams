import { Module } from '@nestjs/common';
import { FranchisesService } from './franchises.service';
import { FranchisesController } from './franchises.controller';

@Module({
  controllers: [FranchisesController],
  providers: [FranchisesService],
})
export class FranchisesModule {}
