import {
  IsString, IsOptional, IsArray, ArrayNotEmpty,
  IsEnum
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AliveStatus, Gender } from '@prisma/client';

export class CreateCharacterDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  emojis?: string[];

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  race?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  ethnicity?: string[];

  @ApiProperty()
  @IsString()
  hair: string;

  @ApiProperty({ enum: AliveStatus })
  @IsEnum(AliveStatus)
  aliveStatus: AliveStatus;

  @ApiPropertyOptional({ default: false }) @IsOptional()
  isProtagonist?: boolean;

  @ApiPropertyOptional({ default: false }) @IsOptional()
  isAntagonist?: boolean;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional() @IsArray() @ArrayNotEmpty()
  franchiseIds?: number[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  imageUrl1?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  imageUrl2?: string;
}
