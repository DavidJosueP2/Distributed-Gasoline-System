import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpsertUnitConsumptionDto {
    @Transform(({ value }) => (value != null ? String(value) : value), { toClassOnly: true })
    @IsString()
    @IsNotEmpty()
    vehicleId!: string;

    @Transform(({ value, obj }) => {
        const picked =
            value ??
            obj?.baselineOverrideLPer_100km ??
            obj?.baseline_override_l_per_100km ??
            obj?.baselineOverrideLPer100Km;

        return picked != null && picked !== '' ? Number(picked) : picked;
    }, { toClassOnly: true })
    @IsNumber({}, { message: 'Baseline override debe ser numérico' })
    @Min(0.0001, { message: 'Baseline override debe ser > 0' })
    baselineOverrideLPer_100km!: number;

    // NOTE: calibrationK se calcula automáticamente y no se acepta como parámetro.
}
