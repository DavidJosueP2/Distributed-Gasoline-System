import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class StartTripDto {
  @IsNumber({}, { message: 'El ID debe ser un número.' })
  @Type(() => Number)
  id!: number;
}
