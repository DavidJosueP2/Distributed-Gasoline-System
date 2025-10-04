import { IsOptional, IsString, IsInt, IsISO8601, IsIn } from 'class-validator';

export class CreateDriverLicenseDto {
    @IsInt()
    driver_id: number;

    @IsInt()
    license_type_id: number;

    @IsOptional()
    @IsString()
    number?: string;

    @IsOptional()
    @IsISO8601()
    issued_at?: string;

    @IsOptional()
    @IsISO8601()
    expires_at?: string;

    @IsOptional()
    @IsInt()
    @IsIn([0,1,2,3])
    status?: number;
}
