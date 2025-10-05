import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO para buscar un modelo de vehículo por su identidad única.
 * La identidad está compuesta por: brand + family + trim + yearFrom + yearTo
 */
export class GetModelByIdentityDto {
    @IsString()
    @IsNotEmpty()
    brand!: string;

    @IsString()
    @IsNotEmpty()
    family!: string;

    @IsOptional()
    @IsString()
    trim?: string; // "" o undefined => null en el dominio

    @IsInt()
    @Min(1900)
    yearFrom!: number;

    @IsOptional()
    @IsInt()
    @Min(0) // 0 significa null/indefinido
    yearTo?: number; // 0 o undefined => null en el dominio
}

