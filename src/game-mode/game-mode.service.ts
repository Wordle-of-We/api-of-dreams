import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModeConfig } from '@prisma/client';
import { CreateGameModeDto } from './dto/create-game-mode.dto';
import { UpdateGameModeDto } from './dto/update-game-mode.dto';

@Injectable()
export class GameModeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGameModeDto): Promise<ModeConfig> {
    return this.prisma.modeConfig.create({
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  async findAll(): Promise<ModeConfig[]> {
    return this.prisma.modeConfig.findMany();
  }

  async findOne(id: number): Promise<ModeConfig> {
    const m = await this.prisma.modeConfig.findUnique({ where: { id } });
    if (!m) throw new NotFoundException(`ModeConfig ${id} não encontrado`);
    return m;
  }

  async update(id: number, dto: UpdateGameModeDto): Promise<ModeConfig> {
    await this.findOne(id);
    return this.prisma.modeConfig.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number): Promise<ModeConfig> {
    await this.findOne(id);
    return this.prisma.modeConfig.delete({ where: { id } });
  }

  async initializeDefaults(): Promise<ModeConfig[]> {
    const defaults = [
      {
        name: 'Clássico',
        description: 'O jogo tradicional de adivinhação de personagens DreamWorks com dicas visuais',
      },
      {
        name: 'Emojis',
        description: 'Descubra o personagem através de pistas divertidas com emojis',
      },
      {
        name: 'Descrição',
        description: 'Use descrições detalhadas para encontrar o personagem misterioso',
      },
      {
        name: 'Imagem',
        description: 'Adivinhe o personagem com base em sua imagem desfocada',
      },
    ];

    const result: ModeConfig[] = [];
    for (const mode of defaults) {
      const existing = await this.prisma.modeConfig.findUnique({ where: { name: mode.name } });
      if (existing) {
        result.push(existing);
      } else {
        const created = await this.prisma.modeConfig.create({
          data: { ...mode, isActive: true },
        });
        result.push(created);
      }
    }
    return result;
  }
}
