import { IsInt } from 'class-validator';

export class StartPlayDto {
  @IsInt()
  modeConfigId: number;
}
