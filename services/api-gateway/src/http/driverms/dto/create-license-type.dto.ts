import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateLicenseTypeDto {
    @IsString()
    code: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_professional?: boolean;
}
