import { PartialType } from '@nestjs/swagger';
import { GuessDto } from './create-play.dto';

export class UpdatePlayDto extends PartialType(GuessDto) {}
