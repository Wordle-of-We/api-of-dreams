import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { Role } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

interface RequestWithUser {
  user: { userId: number; email: string; role: Role };
}

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() dto: CreateAuthDto) {
    const { email, password } = dto;
    if (!email || !password) {
      throw new UnauthorizedException('E-mail e senha são obrigatórios');
    }

    const user = await this.authService.validateUser(email, password);

    if (user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Acesso restrito a administradores');
    }

    const { token } = await this.authService.login(email, password);
    return { token, user };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getProfile(@Req() req: RequestWithUser) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  logout() {
    return { message: 'Faça logout removendo o token no client-side.' };
  }
}
