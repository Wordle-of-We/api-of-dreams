import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: number; email: string; role: Role; isEmailVerified: boolean };
}

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TTL_MS =
  process.env.REFRESH_TTL_DAYS
    ? Number(process.env.REFRESH_TTL_DAYS) * 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

const REQUIRE_EMAIL_VERIFIED_FOR_LOGIN =
  (process.env.REQUIRE_EMAIL_VERIFIED_FOR_LOGIN ?? 'true') !== 'false';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  private signAccessToken(user: { id: number; email: string; role: Role }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload, { expiresIn: ACCESS_EXPIRES_IN });
  }

  private generateRefreshPair() {
    const token = randomBytes(64).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + REFRESH_TTL_MS);
    return { token, hash, expires };
  }

  private async persistRefresh(userId: number, hash: string, expires: Date) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash, refreshTokenExpires: expires },
    });
  }

  private async buildAuthResponse(userId: number): Promise<AuthResponse> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException('Usuário não encontrado');

    const accessToken = this.signAccessToken({ id: u.id, email: u.email, role: u.role });
    const { token: refreshToken, hash, expires } = this.generateRefreshPair();
    await this.persistRefresh(u.id, hash, expires);

    return {
      accessToken,
      refreshToken,
      user: {
        id: u.id,
        email: u.email,
        role: u.role,
        isEmailVerified: !!u.isEmailVerified,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas.');

    if (REQUIRE_EMAIL_VERIFIED_FOR_LOGIN && !user.isEmailVerified) {
      throw new UnauthorizedException(
        'E-mail não verificado. Verifique sua caixa de entrada ou reenvie o e-mail.'
      );
    }

    return this.buildAuthResponse(user.id);
  }

  async loginAdmin(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Acesso restrito a administradores.');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas.');

    if (REQUIRE_EMAIL_VERIFIED_FOR_LOGIN && !user.isEmailVerified) {
      throw new UnauthorizedException(
        'E-mail não verificado. Verifique sua caixa de entrada ou reenvie o e-mail.'
      );
    }

    return this.buildAuthResponse(user.id);
  }

  async refresh(email: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpires) {
      throw new UnauthorizedException('Refresh token inválido.');
    }
    if (user.refreshTokenExpires < new Date()) {
      throw new UnauthorizedException('Refresh token expirado.');
    }

    const providedHash = createHash('sha256').update(refreshToken).digest('hex');
    if (providedHash !== user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const accessToken = this.signAccessToken({ id: user.id, email: user.email, role: user.role });
    const { token: newRt, hash, expires } = this.generateRefreshPair();
    await this.persistRefresh(user.id, hash, expires);

    return { accessToken, refreshToken: newRt };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpires: null },
    });
    return { message: 'Logout bem-sucedido.' };
  }
}
