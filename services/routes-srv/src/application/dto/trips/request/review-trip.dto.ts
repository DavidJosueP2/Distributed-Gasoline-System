import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewTripDto {
  @IsNumber({}, { message: 'El ID debe ser un número.' })
  @Type(() => Number)
  id!: number;

  @IsOptional()
  @IsString({ message: 'El comentario debe ser una cadena de texto.' })
  reviewComment?: string;
}
