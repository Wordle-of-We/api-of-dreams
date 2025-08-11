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
  ) {}

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

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        role: Role.USER,
        username: data.username,
        avatarIconUrl: this.defaultAvatarFromUsername(data.username),
        isEmailVerified: true,
      },
      select: safeUserSelect,
    });

    return created;
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
