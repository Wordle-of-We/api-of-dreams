import { IsEmail, IsNotEmpty, MinLength, Matches, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsNotEmpty() @MinLength(6) password: string;

  @ApiProperty({
    description: 'Username único (3-20, letras, números e _ . - )'
  })
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]{3,20}$/, { message: 'Username inválido' })
  username: string;

  @IsOptional() @IsUrl()
  avatarIconUrl?: string;
}
