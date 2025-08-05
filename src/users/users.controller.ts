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
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

type RequestWithUser = Request & {
  user: { userId: number; role: Role };
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

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
    @Res({ passthrough: true }) res: Response,
  ) {
    const requester = req.user;
    if (requester.userId !== id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para excluir este usuário.');
    }
    await this.usersService.remove(id);
    if (requester.userId === id) {
      res.clearCookie('authToken', {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
      });
    }
    return { message: 'Usuário removido com sucesso.' };
  }
}
