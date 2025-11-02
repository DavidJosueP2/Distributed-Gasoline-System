import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { Logger } from '@nestjs/common';

export class ConsumptionCreateDto {
    private static readonly log = new Logger(ConsumptionCreateDto.name);

    @Transform(({ value, obj, key }) => {
        // 1) Log de entrada y llaves disponibles en el body
        ConsumptionCreateDto.log.debug(
            `[${key}] raw=${JSON.stringify(value)} | bodyKeys=${Object.keys(obj || {}).join(',')}`
        );

        // 2) Candidatos admitidos
        const candidates = {
            direct: value,
            snake_full: obj?.baseline_override_l_per_100km,
            camel_underscore: obj?.baselineOverrideLPer_100Km,
            camel: obj?.baselineOverrideLPer100Km,
        };
        ConsumptionCreateDto.log.debug(`[${key}] candidates=${JSON.stringify(candidates)}`);

        // 3) Coalescencia (orden de prioridad)
        const picked =
            value ??
            candidates.snake_full ??
            candidates.camel_underscore ??
            candidates.camel;

        ConsumptionCreateDto.log.debug(
            `[${key}] picked=${JSON.stringify(picked)} (type=${typeof picked})`
        );

        // 4) Conversión numérica
        const num = picked != null && picked !== '' ? Number(picked) : picked;
        ConsumptionCreateDto.log.debug(
            `[${key}] number=${JSON.stringify(num)} (type=${typeof num})`
        );

        return num;
    }, { toClassOnly: true })
    @ValidateIf((o) => o.baseline_override_l_per_100km !== undefined)
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: 'Baseline override debe ser numérico' })
    @Min(0.0001, { message: 'Baseline override debe ser > 0' })
    baseline_override_l_per_100km?: number;

    // NOTA: calibrationK se calcula automáticamente basándose en:
    // - Año de fabricación del modelo (antigüedad)
    // - Kilometraje actual del vehículo (desgaste)
    // No se acepta como parámetro de entrada.
}
