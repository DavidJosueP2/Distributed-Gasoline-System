import { IsEmail } from 'class-validator';

export class FindUserByEmailRequest {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;
}
