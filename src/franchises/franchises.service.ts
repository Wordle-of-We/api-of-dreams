import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../../config/cloudinary/cloudinary.service';
import { CreateFranchiseDto } from './dto/create-franchise.dto';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';
import type { Franchise } from '@prisma/client';

@Injectable()
export class FranchisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  async create(
    dto: CreateFranchiseDto,
    fileBuffer?: Buffer,
  ): Promise<Franchise> {
    let imageUrl = dto.imageUrl;
    if (fileBuffer) {
      const upload = await this.cloudinary.uploadBuffer(
        fileBuffer,
        'franchises',
        `franchise-${dto.name}-${Date.now()}`,
      );
      imageUrl = upload.secure_url;
    }
    return this.prisma.franchise.create({
      data: { name: dto.name, imageUrl },
    });
  }

  async findAll() {
    return this.prisma.franchise.findMany({
      include: {
        _count: {
          select: { characters: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const fr = await this.prisma.franchise.findUnique({
      where: { id },
      include: {
        _count: {
          select: { characters: true },
        },
      },
    });
    if (!fr) throw new NotFoundException(`Franchise ${id} not found`);
    return fr;
  }

  async update(
    id: number,
    dto: UpdateFranchiseDto,
  ): Promise<Franchise> {
    await this.findOne(id);
    return this.prisma.franchise.update({
      where: { id },
      data: dto,
    });
  }

  async updateImage(
    id: number,
    fileBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<Franchise> {
    const fr = await this.findOne(id);

    if (fr.imageUrl) {
      const publicId = this.cloudinary.extractPublicIdFromUrl(fr.imageUrl);
      await this.cloudinary.deleteImage(publicId);
    }

    let newUrl: string;
    if (fileBuffer) {
      const upload = await this.cloudinary.uploadBuffer(
        fileBuffer,
        'franchises',
        `franchise-${id}-${Date.now()}`,
      );
      newUrl = upload.secure_url;
    } else if (imageUrl) {
      newUrl = imageUrl;
    } else {
      throw new BadRequestException('Envie arquivo ou informe imageUrl');
    }

    return this.prisma.franchise.update({
      where: { id },
      data: { imageUrl: newUrl },
    });
  }

  async deleteImage(id: number): Promise<Franchise> {
    const fr = await this.findOne(id);
    if (!fr.imageUrl) {
      throw new BadRequestException('Não há imagem para remover');
    }
    const publicId = this.cloudinary.extractPublicIdFromUrl(fr.imageUrl);
    await this.cloudinary.deleteImage(publicId);
    return this.prisma.franchise.update({
      where: { id },
      data: { imageUrl: null },
    });
  }

  async remove(id: number): Promise<Franchise> {
    await this.findOne(id);
    return this.prisma.franchise.delete({ where: { id } });
  }
}
