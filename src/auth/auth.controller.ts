import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: { userId: number; email: string };
}

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: CreateAuthDto,
    @Res() res: Response,
  ) {
    const { email, password } = dto;
    if (!email || !password) {
      throw new UnauthorizedException('E‑mail e senha são obrigatórios');
    }

    const { token, user } = await this.authService.login(email, password);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ token, user });
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  getProfile(@Req() req: RequestWithUser) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
    });
    return { message: 'Logout efetuado com sucesso' };
  }
}
