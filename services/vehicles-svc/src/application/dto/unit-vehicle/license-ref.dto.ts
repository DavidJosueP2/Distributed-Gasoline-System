import { IsOptional, IsString, Matches } from 'class-validator';

export class LicenseRefDto {
  @IsOptional() @IsString() licenseTypeCode?: string;
  @IsOptional() @IsString() @Matches(/^[\d]+$/, { message: 'Licencia debe contener sólo dígitos' }) licenseTypeId?: string;
}

