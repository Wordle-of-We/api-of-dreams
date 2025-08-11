import { IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class StartPlayDto {
  @IsInt()
  modeConfigId: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve ser YYYY-MM-DD' })
  date?: string;
}
