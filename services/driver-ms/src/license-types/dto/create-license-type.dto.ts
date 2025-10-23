import { IsString, IsBoolean, IsOptional, Length } from 'class-validator';

export class CreateLicenseTypeDto {
  @IsString()
  @Length(1, 10)
  code: string;

  @IsString()
  @IsOptional()
  @Length(0, 160)
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_professional?: boolean;
}
