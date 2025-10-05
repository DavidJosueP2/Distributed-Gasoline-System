import {
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePasswordRequest {

  @Type(() => Number)
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  @IsInt({ message: 'El ID del usuario debe ser un número entero' })
  userId!: number;

  @IsString({ message: 'La nueva contraseña debe ser un texto' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[A-Z])/, { message: 'La nueva contraseña debe contener al menos una letra mayúscula' })
  @Matches(/(?=.*\d)/, { message: 'La nueva contraseña debe contener al menos un número' })
  newPassword!: string;

}
