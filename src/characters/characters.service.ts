import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../config/cloudinary/cloudinary.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import type { Character } from '@prisma/client';

@Injectable()
export class CharactersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  async create(
    dto: CreateCharacterDto,
    fileBuffer?: Buffer,
  ): Promise<Character> {
    let imageUrl1 = dto.imageUrl1;
    if (fileBuffer) {
      const upload = await this.cloudinary.uploadBuffer(
        fileBuffer,
        'characters',
        `character-${dto.name}-${Date.now()}`,
      );
      imageUrl1 = upload.secure_url;
    }

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
        imageUrl1,
        imageUrl2: dto.imageUrl2,
        franchises: dto.franchiseIds
          ? {
              create: dto.franchiseIds.map((fid) => ({
                franchise: { connect: { id: Number(fid) } },
              })),
            }
          : undefined,
      },
      include: {
        franchises: { include: { franchise: true } },
      },
    });
  }

  async findAll(): Promise<(Character & { franchiseNames: string[] })[]> {
    const chars = await this.prisma.character.findMany({
      include: {
        franchises: {
          include: { franchise: true },
        },
      },
    });

    return chars.map((c) => ({
      ...c,
      franchiseNames: c.franchises.map((cf) => cf.franchise.name),
    }));
  }

  async findOne(id: number): Promise<Character & { franchiseNames: string[] }> {
    const c = await this.prisma.character.findUnique({
      where: { id },
      include: { franchises: { include: { franchise: true } } },
    });
    if (!c) throw new NotFoundException(`Character ${id} not found`);

    return {
      ...c,
      franchiseNames: c.franchises.map((cf) => cf.franchise.name),
    };
  }

  async update(
    id: number,
    dto: UpdateCharacterDto,
  ): Promise<Character> {
    await this.findOne(id);

    const { franchiseIds, ...rest } = dto as any;

    return this.prisma.character.update({
      where: { id },
      data: {
        ...rest,
        imageUrl2: dto.imageUrl2,
        franchises: franchiseIds
          ? {
              deleteMany: {},
              create: franchiseIds.map((fid: string) => ({
                franchise: { connect: { id: Number(fid) } },
              })),
            }
          : undefined,
      },
      include: {
        franchises: { include: { franchise: true } },
      },
    });
  }

  async updateImage(
    id: number,
    fileBuffer?: Buffer,
    imageUrl1?: string,
  ): Promise<Character> {
    const character = await this.findOne(id);

    if (character.imageUrl1) {
      const publicId =
        this.cloudinary.extractPublicIdFromUrl(character.imageUrl1);
      await this.cloudinary.deleteImage(publicId);
    }

    let newUrl: string;
    if (fileBuffer) {
      const upload = await this.cloudinary.uploadBuffer(
        fileBuffer,
        'characters',
        `character-${id}-${Date.now()}`,
      );
      newUrl = upload.secure_url;
    } else if (imageUrl1) {
      newUrl = imageUrl1;
    } else {
      throw new BadRequestException(
        'Envie um arquivo ou informe imageUrl1 no body',
      );
    }

    return this.prisma.character.update({
      where: { id },
      data: { imageUrl1: newUrl },
      include: { franchises: { include: { franchise: true } } },
    });
  }

  async deleteImage(id: number): Promise<Character> {
    const character = await this.findOne(id);

    if (!character.imageUrl1) {
      throw new BadRequestException('Character does not have an image to delete');
    }

    const publicId =
      this.cloudinary.extractPublicIdFromUrl(character.imageUrl1);
    await this.cloudinary.deleteImage(publicId);

    return this.prisma.character.update({
      where: { id },
      data: { imageUrl1: null },
      include: { franchises: { include: { franchise: true } } },
    });
  }

  async remove(id: number): Promise<Character> {
    await this.findOne(id);

    await this.prisma.characterFranchise.deleteMany({
      where: { characterId: id },
    });
    await this.prisma.play.deleteMany({ where: { characterId: id } });
    await this.prisma.attempt.deleteMany({ where: { characterId: id } });
    await this.prisma.dailySelection.deleteMany({
      where: { characterId: id },
    });

    return this.prisma.character.delete({ where: { id } });
  }
}
