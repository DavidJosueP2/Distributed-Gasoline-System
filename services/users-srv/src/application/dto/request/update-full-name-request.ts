import {
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFullNameUserDto {

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

 
}