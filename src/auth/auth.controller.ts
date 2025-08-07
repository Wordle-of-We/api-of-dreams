import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import type { Request } from 'express';

interface Profile {
  userId: number;
  email: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string
  ): Promise<AuthResponse> {
    return this.authService.login(email, password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request): Profile {
    return (req as any).user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    return { message: 'Logout bem-sucedido. Remova o token no client-side.' };
  }
}
