import {VehicleModel} from "../../../domain";
import { ModelEngineSpec } from "../../../domain/entities/model-engine-spec";

export class GrpcModelMapper {
    static toProto(vm: VehicleModel) {
        return {
            modelId: Number(vm.id),
            brand: vm.brand,
            family: vm.family,
            trim: vm.trim ?? '',
            yearFrom: vm.yearFrom,
            yearTo: vm.yearTo ?? 0,
            machineType: mapMachineType(vm.machineType),
            status: vm.status,
            createdAt: ts(vm.createdAt),
            updatedAt: ts(vm.updatedAt),
        };
    }

    /**
     * Mapea engine spec del dominio a Protobuf.
     * IMPORTANTE: Protobuf usa baselineLPer_100km (con guión bajo antes del número)
     */
    static toEngineProto(engine: ModelEngineSpec | undefined | null) {
        if (!engine) return undefined;

        return {
            engineType: mapEngineType(engine.engineType),
            displacementCc: engine.displacementCc ?? 0,
            powerHp: engine.powerHp ?? 0,
            baselineLPer_100km: engine.baselineLPer100km, // Dominio sin _ → Proto con _
        };
    }

    /**
     * Mapea licencias del dominio a Protobuf.
     */
    static toLicensesProto(licenses?: { code?: string; id?: bigint }[]) {
        if (!licenses || licenses.length === 0) return [];

        return licenses.map(lic => ({
            licenseTypeCode: lic.code ?? undefined,
            licenseTypeId: lic.id ? Number(lic.id) : undefined,
        }));
    }
}

function mapMachineType(s: string | undefined) {
    if (s === 'LIGHT') return 1;
    if (s === 'HEAVY') return 2;
    return 0;
}

function mapEngineType(s: string | undefined) {
    if (s === 'GASOLINE') return 1;
    if (s === 'DIESEL') return 2;
    if (s === 'HYBRID') return 3;
    return 0;
}

function ts(d?: Date) {
    if (!d) return undefined;
    const ms = d.getTime();
    return { seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1e6 };
}
