import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import * as multer from 'multer';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../src/auth/guard/jwt-auth.guard';
import { RolesGuard } from '../../src/auth/guard/roles.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('characters')
@Controller('characters')
export class CharactersController {
  constructor(private readonly service: CharactersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        emojis: { type: 'array', items: { type: 'string' }, nullable: true },
        gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
        race: { type: 'array', items: { type: 'string' }, nullable: true },
        ethnicity: { type: 'array', items: { type: 'string' }, nullable: true },
        hair: { type: 'string' },
        aliveStatus: { type: 'string', enum: ['ALIVE', 'DEAD'] },
        paper: { type: 'array', items: { type: 'string' }, nullable: true },
        franchiseIds: { type: 'array', items: { type: 'number' }, nullable: true },
        imageUrl1: { type: 'string', nullable: true },
        imageUrl2: { type: 'string', nullable: true },
        file: { type: 'string', format: 'binary', nullable: true },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async create(
    @Body() dto: CreateCharacterDto,
    @UploadedFile() file: Multer.File,
  ) {
    return this.service.create(dto, file?.buffer);
  }

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl1: { type: 'string', nullable: true },
        file: { type: 'string', format: 'binary', nullable: true },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Multer.File,
    @Body() body: { imageUrl1?: string },
  ) {
    return this.service.updateImage(id, file?.buffer, body.imageUrl1);
  }

  @Delete(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteImage(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Patch(':id/image2')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl2: { type: 'string', nullable: true },
        file: { type: 'string', format: 'binary', nullable: true },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async updateImage2(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Multer.File,
    @Body() body: { imageUrl2?: string },
  ) {
    return this.service.updateImage2(id, file?.buffer, body.imageUrl2);
  }

  @Delete(':id/image2')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async deleteImage2(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteImage2(id);
  }
}
