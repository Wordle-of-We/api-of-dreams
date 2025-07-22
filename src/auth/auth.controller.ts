import { Controller, Post, Body, Res, UnauthorizedException, UseGuards, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guard/jwt-auth.guard';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() createAuthDTO: CreateAuthDto, @Res() res: Response) {
    console.log('🔍 Dados recebidos no DTO:', createAuthDTO);

    if (!createAuthDTO.email || !createAuthDTO.password) {
      throw new UnauthorizedException('E-mail e senha são obrigatórios');
    }

    const { token, user } = await this.authService.login(createAuthDTO.email, createAuthDTO.password);

    res.cookie('authToken', token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === 'production',
      secure: false,
      sameSite: 'strict',
    });

    return res.json({ message: 'Login realizado com sucesso!', user });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  getProfile(@Req() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  async logout(
    @Res({ passthrough: true }) res: Response
  ) {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { message: 'Logout efetuado com sucesso' };
  }
}
