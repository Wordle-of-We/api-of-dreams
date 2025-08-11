import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateGameModeDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  imageUseSecondImage?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  imageBlurStart?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  imageBlurStep?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  imageBlurMin?: number;
}
