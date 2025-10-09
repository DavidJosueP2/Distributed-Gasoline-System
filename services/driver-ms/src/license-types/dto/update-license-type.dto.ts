import { PartialType } from '@nestjs/mapped-types';
import { CreateLicenseTypeDto } from './create-license-type.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateLicenseTypeDto extends PartialType(CreateLicenseTypeDto) {
  @IsNumber()
  @IsOptional()
  license_type_id?: number;
}
