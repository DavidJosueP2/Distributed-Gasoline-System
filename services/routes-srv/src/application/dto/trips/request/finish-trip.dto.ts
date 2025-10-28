import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FinishTripDto {
  @IsNumber({}, { message: 'El ID debe ser un número.' })
  @Type(() => Number)
  id!: number;

  @IsNumber({}, { message: 'El odómetro final debe ser un número.' })
  @Min(0, { message: 'El odómetro final debe ser mayor o igual a 0.' })
  @Type(() => Number)
  odometerEnd!: number;
}
