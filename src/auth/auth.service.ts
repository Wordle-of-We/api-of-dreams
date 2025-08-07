import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

export interface AuthResponse {
  token: string;
  user: { id: number; email: string; role: Role };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Acesso restrito a administradores.');
    }
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);
    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
