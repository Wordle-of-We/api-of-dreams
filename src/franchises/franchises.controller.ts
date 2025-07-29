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
import { FranchisesService } from './franchises.service';
import { CreateFranchiseDto } from './dto/create-franchise.dto';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('franchises')
@Controller('franchises')
export class FranchisesController {
  constructor(private readonly service: FranchisesService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', { storage: multer.memoryStorage() })
  )
  create(
    @Body() dto: CreateFranchiseDto,
    @UploadedFile() file?: multer.File
  ) {
    return this.service.create(dto, file?.buffer)
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFranchiseDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Patch(':id/image')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', { storage: multer.memoryStorage() }),
  )
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Multer.File,
    @Body() body: { imageUrl?: string },
  ) {
    return this.service.updateImage(id, file?.buffer, body.imageUrl);
  }

  @Delete(':id/image')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteImage(id);
  }
}
