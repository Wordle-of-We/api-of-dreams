import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role, Prisma } from '@prisma/client';
import { EmailCheckService } from './email-check.service';
import { MailerService } from '../../common/mailer.service';
import { randomBytes, createHash } from 'crypto';

const SALT_ROUNDS = 10;

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  isEmailVerified: true,
  username: true,
  avatarIconUrl: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailCheck: EmailCheckService,
    private readonly mailer: MailerService,
  ) { }

  private generateVerificationPair() {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    return { token, tokenHash, expires };
  }

  private defaultAvatarFromUsername(username: string) {
    return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
      username,
    )}`;
  }

  async create(data: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      if (existing.email === data.email) {
        throw new BadRequestException('Já existe um usuário com este e-mail.');
      }
      throw new BadRequestException('Este username já está em uso, escolha outro.');
    }

    const hasMx = await this.emailCheck.hasValidMx(data.email);
    if (!hasMx) {
      throw new BadRequestException('Domínio de e-mail inválido ou sem MX.');
    }

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        role: Role.USER,
        username: data.username,
        avatarIconUrl: this.defaultAvatarFromUsername(data.username),
      },
      select: { id: true, email: true },
    });

    const { token, tokenHash, expires } = this.generateVerificationPair();
    await this.prisma.user.update({
      where: { id: created.id },
      data: {
        isEmailVerified: false,
        emailVerifyToken: tokenHash,
        emailVerifyExpires: expires,
      },
    });

    try {
      await this.mailer.sendEmailVerification(created.email, token);
    } catch {
    }

    const safe = await this.prisma.user.findUnique({
      where: { id: created.id },
      select: safeUserSelect,
    });
    return safe!;
  }

  async findAll() {
    return this.prisma.user.findMany({ select: safeUserSelect });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: number, data: UpdateUserDto) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Usuário não encontrado.');

    const updateData: Prisma.UserUpdateInput = {};
    const anyData = data as any;

    if (data.email && data.email !== current.email) {
      const other = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (other && other.id !== id) {
        throw new BadRequestException('Já existe um usuário com este e-mail.');
      }
      updateData.email = data.email;

      const { token, tokenHash, expires } = this.generateVerificationPair();
      updateData.isEmailVerified = false;
      (updateData as any).emailVerifyToken = tokenHash;
      (updateData as any).emailVerifyExpires = expires;

      this.mailer.sendEmailVerification(data.email, token).catch(() => { });
    }

    if (anyData.username && anyData.username !== current.username) {
      const existsUsername = await this.prisma.user.findUnique({
        where: { username: anyData.username },
      });
      if (existsUsername && existsUsername.id !== id) {
        throw new BadRequestException('Este username já está em uso, escolha outro.');
      }
      updateData.username = anyData.username;
    }

    if (anyData.avatarIconUrl) {
      updateData.avatarIconUrl = anyData.avatarIconUrl;
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: safeUserSelect,
    });
  }

  async remove(id: number) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return this.prisma.user.delete({ where: { id } });
  }

  async verifyEmail(email: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerifyToken || !user.emailVerifyExpires) {
      throw new BadRequestException('Token inválido.');
    }
    if (user.isEmailVerified) {
      return { message: 'E-mail já verificado.' };
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (user.emailVerifyToken !== tokenHash) {
      throw new BadRequestException('Token inválido.');
    }
    if (user.emailVerifyExpires < new Date()) {
      throw new BadRequestException('Token expirado.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    return { message: 'E-mail verificado com sucesso.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'Se existir, um e-mail foi enviado.' };
    if (user.isEmailVerified) {
      return { message: 'E-mail já verificado.' };
    }

    const { token, tokenHash, expires } = this.generateVerificationPair();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: tokenHash,
        emailVerifyExpires: expires,
      },
    });

    await this.mailer.sendEmailVerification(email, token);
    return { message: 'Se existir, um e-mail foi enviado.' };
  }

  async updateRole(id: number, role: Role) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuário não encontrado.');

    if (target.role === Role.ADMIN && role !== Role.ADMIN) {
      const admins = await this.prisma.user.count({ where: { role: Role.ADMIN } });
      if (admins <= 1) {
        throw new BadRequestException('Não é possível rebaixar o último administrador.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: safeUserSelect,
    });
  }
}
