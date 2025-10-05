import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {

  @Type(() => Number)
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  @IsInt({ message: 'El ID del usuario debe ser un número entero' })
  userId!: number;

  @IsString({ message: 'El nombre debe ser un texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  firstName!: string;

  @IsString({ message: 'El apellido debe ser un texto' })
  @Length(2, 100, { message: 'El apellido debe tener entre 2 y 100 caracteres' })
  lastName!: string;

  @IsEmail({}, { message: 'El correo debe ser un correo válido' })
  email!: string;

  @IsString({ message: 'El teléfono debe ser un texto' })
  @Length(6, 20, { message: 'El teléfono debe tener entre 6 y 20 caracteres' })
  phone!: string;

  @IsString({ message: 'El nombre de usuario debe ser un texto' })
  @Length(4, 60, { message: 'El nombre de usuario debe tener entre 4 y 60 caracteres' })
  username!: string;

  @IsString({ message: 'La nueva contraseña debe ser un texto' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[A-Z])/, { message: 'La nueva contraseña debe contener al menos una letra mayúscula' })
  @Matches(/(?=.*\d)/, { message: 'La nueva contraseña debe contener al menos un número' })
  password!: string;

  @IsString({ message: 'El estado debe ser un texto' })
  status!: string;

  @IsOptional()
  @IsArray({ message: 'Los roles deben ser un arreglo de números' })
  @IsInt({ each: true, message: 'Cada rol debe ser un número entero' })
  @Type(() => Number)
  roleIds?: number[];
}