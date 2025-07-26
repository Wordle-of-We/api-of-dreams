import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

export class CreateGameModeDto {
  @ApiProperty({ example: 'CHARACTERISTICS' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean;
}
