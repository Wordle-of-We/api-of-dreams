import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule }   from '../../prisma/prisma.module';
import { AuthModule }     from '../auth/auth.module';
import { StatsModule }    from '../stats/stats.module';
import { UsersService }   from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    forwardRef(() => StatsModule),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
