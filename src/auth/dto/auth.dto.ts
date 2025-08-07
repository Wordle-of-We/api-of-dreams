import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  password: string;
}
