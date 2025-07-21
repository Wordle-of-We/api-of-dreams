import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFranchiseDto } from './dto/create-franchise.dto';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';

@Injectable()
export class FranchisesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateFranchiseDto) {
    return this.prisma.franchise.create({ data: { name: dto.name } });
  }

  async findAll() {
    return this.prisma.franchise.findMany();
  }

  async findOne(id: number) {
    const franchise = await this.prisma.franchise.findUnique({ where: { id } });
    if (!franchise) {
      throw new NotFoundException(`Franchise ${id} not found`);
    }
    return franchise;
  }

  async update(id: number, dto: UpdateFranchiseDto) {
    await this.findOne(id);
    return this.prisma.franchise.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.franchise.delete({ where: { id } });
  }
}
