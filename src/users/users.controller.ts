import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: number; role: Role };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.USER)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = req.user;
    if (userId !== id && role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir este usuário.',
      );
    }
    await this.usersService.remove(id);
    return { message: 'Usuário removido com sucesso.' };
  }
}
