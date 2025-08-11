import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { MinLength, IsOptional, IsEmail, Matches, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Nova senha do usuário (mínimo 6 caracteres)' })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @Matches(/^[a-zA-Z0-9._-]{3,20}$/, { message: 'Username inválido' })
  username?: string;

  @IsOptional() @IsUrl()
  avatarIconUrl?: string;
}
