import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CharactersController } from './characters.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'config/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, AuthModule, CloudinaryModule],
  controllers: [CharactersController],
  providers: [CharactersService],
})
export class CharactersModule { }