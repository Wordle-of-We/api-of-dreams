import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFranchiseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'URL pública da capa (opcional).' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}