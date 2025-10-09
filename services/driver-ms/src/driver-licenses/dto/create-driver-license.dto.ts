import {
  IsNumber,
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateDriverLicenseHttpDto {
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
}