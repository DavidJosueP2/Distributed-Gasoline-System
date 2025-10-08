import { IsString, IsOptional } from 'class-validator';

export class SuspendLicenseDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
