// prisma/seed.ts
import { PrismaClient, Prisma, MachineType, EngineType, OperationalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureModelLicenseRequirement(modelId: bigint, code: string, licenseTypeId: bigint | null) {
    const existing = await prisma.modelLicenseRequirement.findFirst({
        where: {
            modelId,
            licenseTypeCode: code,
            licenseTypeId: licenseTypeId, // puede ser null
            deletedAt: null,              // en filtros sí se acepta null
        },
    });
    if (!existing) {
        await prisma.modelLicenseRequirement.create({
            data: {
                modelId,
                licenseTypeCode: code,
                licenseTypeId: licenseTypeId, // null ok
            },
        });
    }
}

async function ensureUnitLicenseRequirement(vehicleId: bigint, code: string, licenseTypeId: bigint | null) {
    const existing = await prisma.unitLicenseRequirement.findFirst({
        where: {
            vehicleId,
            licenseTypeCode: code,
            licenseTypeId: licenseTypeId, // puede ser null
            deletedAt: null,              // en filtros sí se acepta null
        },
    });
    if (!existing) {
        await prisma.unitLicenseRequirement.create({
            data: {
                vehicleId,
                licenseTypeCode: code,
                licenseTypeId: licenseTypeId, // null ok
            },
        });
    }
}

async function main() {
    // 1) Modelo (Volvo FH 460 2022…)
    let model = await prisma.vehicleModel.findFirst({
        where: {
            brand: 'Volvo',
            family: 'FH',
            trim: '460',
            yearFrom: 2022,
            yearTo: null,
            deletedAt: null,
        },
    });

    model ??= await prisma.vehicleModel.create({
        data: {
            brand: 'Volvo',
            family: 'FH',
            trim: '460',
            yearFrom: 2022,
            yearTo: null,
            machineType: MachineType.HEAVY,
        },
    });

    // 2) Especificación de motor (1:1 por modelId)
    await prisma.modelEngineSpec.upsert({
        where: { modelId: model.modelId },
        update: {},
        create: {
            modelId: model.modelId,
            engineType: EngineType.DIESEL,
            displacementCc: new Prisma.Decimal('12800'),
            powerHp: new Prisma.Decimal('460'),
            baselineLPer100km: new Prisma.Decimal('28'),
        },
    });

    // 3) Requisitos de licencia a nivel de modelo (usar IDs reales del otro MS)
    // E = 5, C = 3
    await ensureModelLicenseRequirement(model.modelId, 'E', 5n);
    await ensureModelLicenseRequirement(model.modelId, 'C', 3n);

    // 4) Unidad (buscar por placa para evitar duplicar)
    let unit = await prisma.vehicleUnit.findFirst({
        where: { plate: 'PQR-456', deletedAt: null },
    });

    unit ??= await prisma.vehicleUnit.create({
        data: {
            modelId: model.modelId,
            plate: 'PQR-456',
            operationalStatus: OperationalStatus.ACTIVE,
            tankCapacityL: new Prisma.Decimal('600'),
        },
    });

    // 5) Consumo de la unidad
    await prisma.unitConsumptionSpec.upsert({
        where: { vehicleId: unit.vehicleId },
        update: {
            baselineOverrideLPer100km: new Prisma.Decimal('30'),
            calibrationK: new Prisma.Decimal('1.05'),
        },
        create: {
            vehicleId: unit.vehicleId,
            baselineOverrideLPer100km: new Prisma.Decimal('30'),
            calibrationK: new Prisma.Decimal('1.05'),
        },
    });

    // 6) Requisitos de licencia a nivel de unidad (hereda E)
    await ensureUnitLicenseRequirement(unit.vehicleId, 'E', 5n);
    // Si también quieres C a nivel unidad, descomenta:
    // await ensureUnitLicenseRequirement(unit.vehicleId, 'C', 3n);
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
