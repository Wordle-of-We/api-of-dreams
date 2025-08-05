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
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: { userId: number; email: string; role: Role };
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
      throw new UnauthorizedException('E-mail e senha são obrigatórios');
    }

    const user = await this.authService.validateUser(email, password);

    if (user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Acesso restrito a administradores');
    }

    const { token } = await this.authService.login(email, password);

    res.cookie('authToken', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ token, user });
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProfile(@Req() req: RequestWithUser) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('authToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/',
    });
    return { message: 'Logout efetuado com sucesso' };
  }
}
