import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DailySelectionService } from './daily-selection.service';
import { CreateDailySelectionDto } from './dto/create-daily-selection.dto';
import { UpdateDailySelectionDto } from './dto/update-daily-selection.dto';

@Controller('daily-selection')
export class DailySelectionController {
  constructor(private readonly dailySelectionService: DailySelectionService) {}

  @Post()
  create(@Body() createDailySelectionDto: CreateDailySelectionDto) {
    return this.dailySelectionService.create(createDailySelectionDto);
  }

  @Get()
  findAll() {
    return this.dailySelectionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailySelectionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDailySelectionDto: UpdateDailySelectionDto) {
    return this.dailySelectionService.update(+id, updateDailySelectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dailySelectionService.remove(+id);
  }
}
