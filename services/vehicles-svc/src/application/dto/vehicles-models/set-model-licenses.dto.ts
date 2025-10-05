import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LicenseRefDto } from '../unit-vehicle/license-ref.dto';

/**
 * DTO para establecer/reemplazar el array completo de licencias requeridas de un modelo.
 * Aplica soft-unique: elimina duplicados antes de guardar.
 */
export class SetModelLicensesDto {
    @IsString()
    @IsNotEmpty()
    modelId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LicenseRefDto)
    licenses!: LicenseRefDto[];
}
