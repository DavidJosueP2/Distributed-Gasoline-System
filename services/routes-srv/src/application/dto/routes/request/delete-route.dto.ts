import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DeleteRouteDto {
  @IsNumber({}, { message: 'El ID debe ser un número.' })
  @Type(() => Number)
  id!: number;
}
