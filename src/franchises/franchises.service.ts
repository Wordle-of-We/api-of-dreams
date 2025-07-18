import { Injectable } from '@nestjs/common';
import { CreateFranchiseDto } from './dto/create-franchise.dto';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';

@Injectable()
export class FranchisesService {
  create(createFranchiseDto: CreateFranchiseDto) {
    return 'This action adds a new franchise';
  }

  findAll() {
    return `This action returns all franchises`;
  }

  findOne(id: number) {
    return `This action returns a #${id} franchise`;
  }

  update(id: number, updateFranchiseDto: UpdateFranchiseDto) {
    return `This action updates a #${id} franchise`;
  }

  remove(id: number) {
    return `This action removes a #${id} franchise`;
  }
}
