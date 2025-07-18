import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'Nova senha do usuário (mínimo 6 caracteres)' })
  @IsOptional()
  @MinLength(6)
  password?: string;
}
