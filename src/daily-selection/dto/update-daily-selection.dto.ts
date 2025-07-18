import { PartialType } from '@nestjs/swagger';
import { CreateDailySelectionDto } from './create-daily-selection.dto';

export class UpdateDailySelectionDto extends PartialType(CreateDailySelectionDto) {}
