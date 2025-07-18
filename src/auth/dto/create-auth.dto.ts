import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateAuthDto {
  @ApiProperty({ example: 'johndoe@example.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password: string;
}
