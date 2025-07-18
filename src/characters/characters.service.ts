import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCharacterDto) {
    const { franchiseIds = [], imageUrls = [], ...data } = dto;
    return this.prisma.character.create({
      data: {
        ...data,
        imageUrl1: imageUrls[0] || null,
        imageUrl2: imageUrls[1] || null,
        franchises: {
          create: franchiseIds.map(franchiseId => ({
            franchise: { connect: { id: franchiseId } },
          })),
        },
      },
      include: { franchises: { include: { franchise: true } } },
    });
  }

  async findAll() {
    return this.prisma.character.findMany({
      include: { franchises: { include: { franchise: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const character = await this.prisma.character.findUnique({
      where: { id },
      include: { franchises: { include: { franchise: true } } },
    });
    if (!character) {
      throw new NotFoundException(`Character #${id} not found`);
    }
    return character;
  }

  async update(id: number, dto: UpdateCharacterDto) {
    await this.findOne(id);
    const { franchiseIds, imageUrls, ...data } = dto;
    const updateData: any = { ...data };

    if (imageUrls) {
      updateData.imageUrl1 = imageUrls[0] || null;
      updateData.imageUrl2 = imageUrls[1] || null;
    }

    // Atualiza relacionamentos de franquias
    if (franchiseIds) {
      updateData.franchises = {
        deleteMany: {},
        create: franchiseIds.map(franchiseId => ({
          franchise: { connect: { id: franchiseId } },
        })),
      };
    }

    return this.prisma.character.update({
      where: { id },
      data: updateData,
      include: { franchises: { include: { franchise: true } } },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.character.delete({ where: { id } });
    return { deleted: true };
  }
}
