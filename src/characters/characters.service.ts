import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCharacterDto) {
    return this.prisma.character.create({
      data: {
        name: dto.name,
        description: dto.description,
        emojis: dto.emojis ?? [],
        gender: dto.gender,
        race: dto.race ?? [],
        ethnicity: dto.ethnicity ?? [],
        hair: dto.hair,
        aliveStatus: dto.aliveStatus,
        isProtagonist: dto.isProtagonist,
        isAntagonist: dto.isAntagonist,
        imageUrl1: dto.imageUrl1,
        imageUrl2: dto.imageUrl2,
        franchises: dto.franchiseIds
          ? {
            create: dto.franchiseIds.map(id => ({
              franchise: { connect: { id } },
            })),
          }
          : undefined,
      },
      include: { franchises: { include: { franchise: true } } },
    });
  }

  async findAll() {
    return this.prisma.character.findMany({
      include: { franchises: { include: { franchise: true } } },
    });
  }

  async findOne(id: number) {
    const character = await this.prisma.character.findUnique({
      where: { id },
      include: { franchises: { include: { franchise: true } } },
    });
    if (!character) {
      throw new NotFoundException(`Character ${id} not found`);
    }
    return character;
  }

  async update(id: number, dto: UpdateCharacterDto) {
    await this.findOne(id);
    return this.prisma.character.update({
      where: { id },
      data: {
        ...dto,
        emojis: dto.emojis,
        race: dto.race,
        ethnicity: dto.ethnicity,
        hair: dto.hair,
        franchises: dto.franchiseIds
          ? {
            deleteMany: {},
            create: dto.franchiseIds.map(franchiseId => ({
              franchise: { connect: { id: franchiseId } },
            })),
          }
          : undefined,
      },
      include: { franchises: { include: { franchise: true } } },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.characterFranchise.deleteMany({ where: { characterId: id } });
    await this.prisma.play.deleteMany({ where: { characterId: id } });
    await this.prisma.attempt.deleteMany({ where: { characterId: id } });
    await this.prisma.dailySelection.deleteMany({ where: { characterId: id } });
    return this.prisma.character.delete({ where: { id } });
  }
}
