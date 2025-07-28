import { IsString, IsOptional } from 'class-validator';

export class GuessDto {
  @IsString()
  guess: string;

  @IsOptional()
  @IsString()
  guestId?: string;
}
