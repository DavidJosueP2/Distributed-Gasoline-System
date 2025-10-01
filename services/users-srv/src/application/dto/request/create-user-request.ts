import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength, ArrayNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string;

  @IsString()
  @Length(4, 60)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  roleIds?: number[];
}