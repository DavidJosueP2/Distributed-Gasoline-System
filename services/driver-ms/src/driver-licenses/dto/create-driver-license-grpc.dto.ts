import {
  IsNumber,
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateDriverLicenseGrpcDto {
  @IsNumber()
  driver_id: number;

  @IsNumber()
  license_type_id: number;

  @IsString()
  number: string;

  @IsDateString()
  issued_at: string;

  @IsDateString()
  expires_at: string;

  @IsEnum(['VALID', 'EXPIRED', 'SUSPENDED'])
  @IsOptional()
  status?: string;

  @IsNumber()
  version:number;
}