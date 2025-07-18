import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsOptional, IsUrl, IsArray, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';
import { Gender, Race, Ethnicity, Hair, AliveStatus } from '@prisma/client';

export class CreateCharacterDto {
  @ApiProperty({ description: 'Nome único do personagem' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descrição para o modo de descrição' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Emoji representativo do personagem' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ enum: Gender, description: 'Gênero do personagem' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ enum: Race, description: 'Raça do personagem' })
  @IsEnum(Race)
  race: Race;

  @ApiProperty({ enum: Ethnicity, description: 'Cor / Etnia do personagem' })
  @IsEnum(Ethnicity)
  ethnicity: Ethnicity;

  @ApiProperty({ enum: Hair, description: 'Cor do cabelo' })
  @IsEnum(Hair)
  hair: Hair;

  @ApiProperty({ enum: AliveStatus, description: 'Status de vida (vivo / morto)' })
  @IsEnum(AliveStatus)
  aliveStatus: AliveStatus;

  @ApiPropertyOptional({ description: 'Flag se é protagonista' })
  @IsOptional()
  @IsBoolean()
  isProtagonist?: boolean;

  @ApiPropertyOptional({ description: 'Flag se é antagonista' })
  @IsOptional()
  @IsBoolean()
  isAntagonist?: boolean;

  @ApiPropertyOptional({ description: 'URLs de imagem (até 2)' })
  @IsOptional()
  @IsUrl({}, { each: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  imageUrls?: string[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'IDs das franquias associadas',
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  franchiseIds?: number[];
}
