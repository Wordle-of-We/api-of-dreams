import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AccessLogsService } from './access-logs.service';
import { CreateAccessLogDto } from './dto/create-access-log.dto';
import { UpdateAccessLogDto } from './dto/update-access-log.dto';

@Controller('access-logs')
export class AccessLogsController {
  constructor(private readonly accessLogsService: AccessLogsService) {}

  @Post()
  create(@Body() createAccessLogDto: CreateAccessLogDto) {
    return this.accessLogsService.create(createAccessLogDto);
  }

  @Get()
  findAll() {
    return this.accessLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accessLogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccessLogDto: UpdateAccessLogDto) {
    return this.accessLogsService.update(+id, updateAccessLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accessLogsService.remove(+id);
  }
}
