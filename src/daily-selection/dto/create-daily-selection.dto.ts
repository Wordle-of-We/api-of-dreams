import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDailySelectionDto {
  @ApiProperty({ example: 5, description: 'ID do personagem a selecionar' })
  @IsInt()
  characterId: number;

  @ApiProperty({ example: 2, description: 'ID da configuração de modo' })
  @IsInt()
  modeConfigId: number;
}
