import { IsNumber } from 'class-validator';

export class CreateLicenseIncludeDto {
  @IsNumber()
  parent_license_type_id: number;

  @IsNumber()
  child_license_type_id: number;
}
