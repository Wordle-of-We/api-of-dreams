import { Controller, Post, Body, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';

interface Profile {
  userId: number;
  email: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string
  ): Promise<AuthResponse> {
    return this.authService.login(email, password);
  }

  @Post('login-admin')
  async loginAdmin(
    @Body('email') email: string,
    @Body('password') password: string
  ): Promise<AuthResponse> {
    return this.authService.loginAdmin(email, password);
  }

  @Post('refresh')
  async refresh(
    @Body('email') email: string,
    @Body('refreshToken') refreshToken: string
  ) {
    return this.authService.refresh(email, refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request): Profile {
    return (req as any).user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    const user = (req as any).user as { userId: number };
    await this.authService.logout(user.userId);
    return { message: 'Logout bem-sucedido. Remova o token no client-side.' };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; token: string }) {
    return this.usersService.verifyEmail(body.email, body.token);
  }

  @Get('verify-email')
  async verifyEmailGet(
    @Query('email') email: string,
    @Query('token') token: string,
  ) {
    return this.usersService.verifyEmail(email, token);
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.usersService.resendVerification(body.email);
  }
}
