import { Module } from '@nestjs/common';
import { FranchisesService } from './franchises.service';
import { FranchisesController } from './franchises.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FranchisesController],
  providers: [FranchisesService],
})
export class FranchisesModule { }
