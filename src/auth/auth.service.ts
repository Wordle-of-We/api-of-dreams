import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas ou conta cadastrada via Google.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return user;
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('E-mail e senha são obrigatórios');
    }

    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { token, user };
  }

  getJwtService() {
    return this.jwtService;
  }
}
