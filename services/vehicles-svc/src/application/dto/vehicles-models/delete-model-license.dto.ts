import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para eliminar una licencia específica de un modelo.
 * Se puede identificar la licencia por código o por ID.
 */
export class DeleteModelLicenseDto {
    @IsString()
    @IsNotEmpty()
    modelId!: string;

    @IsOptional()
    @IsString()
    @Transform(({ value, obj }) => value ?? obj?.license_type_code)
    licenseTypeCode?: string; // 'A'..'G'

    @IsOptional()
    @IsString()
    @Transform(({ value, obj }) => value ?? obj?.license_type_id)
    licenseTypeId?: string; // ID lógico externo
}

