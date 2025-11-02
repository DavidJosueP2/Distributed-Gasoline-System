import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength, ArrayNotEmpty, IsInt, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres.' })
  firstName!: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  @Length(2, 100, { message: 'El apellido debe tener entre 2 y 100 caracteres.' })
  lastName!: string;

  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  email!: string;


  @IsString({ message: 'El teléfono debe ser una cadena de texto.' })
  @Length(6, 20, { message: 'El teléfono debe tener entre 6 y 20 caracteres.' })
  phone!: string;

  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto.' })
  @Length(4, 60, { message: 'El nombre de usuario debe tener entre 4 y 60 caracteres.' })
  username!: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[A-Z])/, { message: 'La contraseña debe contener al menos una letra mayúscula' })
  @Matches(/(?=.*\d)/, { message: 'La contraseña debe contener al menos un número' })
  password!: string;

  @IsOptional()
  @IsInt({ each: true, message: 'Rol invalido.' })
  @Type(() => Number)
  roleIds!: number[];
  

}