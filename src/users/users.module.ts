import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule }   from '../../prisma/prisma.module';
import { AuthModule }     from '../auth/auth.module';
import { UsersService }   from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
