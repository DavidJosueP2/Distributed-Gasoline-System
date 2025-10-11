import { IsOptional, IsNumber, IsEnum } from 'class-validator';
import { DriverAvailability } from '../entities/driver.entity';

export class UpdateDriverDto {
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsEnum(DriverAvailability)
  availability?: DriverAvailability;

  @IsOptional()
  @IsNumber()
  version?: number;
}
