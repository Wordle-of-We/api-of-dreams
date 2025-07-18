import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: 'E-mail único do usuário' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha do usuário (mínimo 6 caracteres)' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: Role, description: 'Papel do usuário (padrão USER)' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
