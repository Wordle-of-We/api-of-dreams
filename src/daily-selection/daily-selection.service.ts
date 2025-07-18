import { Injectable } from '@nestjs/common';
import { CreateDailySelectionDto } from './dto/create-daily-selection.dto';
import { UpdateDailySelectionDto } from './dto/update-daily-selection.dto';

@Injectable()
export class DailySelectionService {
  create(createDailySelectionDto: CreateDailySelectionDto) {
    return 'This action adds a new dailySelection';
  }

  findAll() {
    return `This action returns all dailySelection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dailySelection`;
  }

  update(id: number, updateDailySelectionDto: UpdateDailySelectionDto) {
    return `This action updates a #${id} dailySelection`;
  }

  remove(id: number) {
    return `This action removes a #${id} dailySelection`;
  }
}
