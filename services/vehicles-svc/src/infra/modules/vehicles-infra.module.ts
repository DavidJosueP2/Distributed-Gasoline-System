import { Module } from '@nestjs/common';
import {PrismaModule} from "../../db/prisma/prisma.module";
import {PrismaVehicleModelRepository} from "../../db/prisma/repositories/prisma-vehicle-model.repository";
import {PrismaModelEngineSpecRepository} from "../../db/prisma/repositories/prisma-model-engine-spec.repository";
import {PrismaIdempotencyKeyRepository} from "../../db/prisma/repositories/prisma-idempotency-key.repository";
import {PrismaVehicleUnitRepository} from "../../db/prisma/repositories/prisma-vehicle-unit.repository";
import {PrismaUnitConsumptionSpecsRepository} from "../../db/prisma/repositories/prisma-unit-consumption-specs.repository";
import {TOKENS} from "../../application/tokens";

@Module({
    imports: [PrismaModule],
    providers: [
        PrismaVehicleModelRepository,
        PrismaModelEngineSpecRepository,
        PrismaIdempotencyKeyRepository,
        PrismaVehicleUnitRepository,
        PrismaUnitConsumptionSpecsRepository,
        { provide: TOKENS.VehicleModelRepository, useClass: PrismaVehicleModelRepository },
        { provide: TOKENS.ModelEngineSpecRepository, useClass: PrismaModelEngineSpecRepository },
        { provide: TOKENS.IdempotencyKeyRepository, useClass: PrismaIdempotencyKeyRepository },
        { provide: TOKENS.VehicleUnitRepository, useClass: PrismaVehicleUnitRepository },
        { provide: TOKENS.UnitConsumptionSpecsRepository, useClass: PrismaUnitConsumptionSpecsRepository },
    ],
    exports: [
        TOKENS.VehicleModelRepository,
        TOKENS.ModelEngineSpecRepository,
        TOKENS.IdempotencyKeyRepository,
        TOKENS.VehicleUnitRepository,
        TOKENS.UnitConsumptionSpecsRepository,
    ],
})
export class VehiclesInfraModule {}
