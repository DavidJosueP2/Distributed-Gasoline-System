// prisma/seed.ts
import { PrismaClient, Prisma, MachineType, EngineType, OperationalStatus } from '@prisma/client';

const prisma = new PrismaClient();

/** Ajusta estos IDs si en tu MS son distintos */
const LICENSE_IDS: Record<string, bigint> = {
    A: 1n,
    B: 2n,
    C: 3n,
    D: 4n,
    E: 5n,
    F: 6n,
    G: 7n,
};

async function ensureModelLicenseRequirement(modelId: bigint, code: string, licenseTypeId: bigint | null) {
    const existing = await prisma.modelLicenseRequirement.findFirst({
        where: { modelId, licenseTypeCode: code, licenseTypeId, deletedAt: null },
    });
    if (!existing) {
        await prisma.modelLicenseRequirement.create({
            data: { modelId, licenseTypeCode: code, licenseTypeId },
        });
    }
}

async function ensureUnitLicenseRequirement(vehicleId: bigint, code: string, licenseTypeId: bigint | null) {
    const existing = await prisma.unitLicenseRequirement.findFirst({
        where: { vehicleId, licenseTypeCode: code, licenseTypeId, deletedAt: null },
    });
    if (!existing) {
        await prisma.unitLicenseRequirement.create({
            data: { vehicleId, licenseTypeCode: code, licenseTypeId },
        });
    }
}

/** Catálogo de 20 modelos (mezcla livianos/pesados/especiales) */
type SeedModel = {
    brand: string;
    family: string;
    trim: string;
    yearFrom: number;
    machineType: MachineType;
    engine: {
        engineType: EngineType;
        displacementCc: string;
        powerHp: string;
        baselineLPer100km: string;
    };
    requiredLicenses: string[];
};

const MODELS: SeedModel[] = [
    // ===== Pesados CARGA (E) =====
    {
        brand: 'Volvo', family: 'FH', trim: '460', yearFrom: 2022, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '12800', powerHp: '460', baselineLPer100km: '28' },
        requiredLicenses: ['E', 'C'],
    },
    {
        brand: 'Scania', family: 'R', trim: '500', yearFrom: 2021, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '13000', powerHp: '500', baselineLPer100km: '30' },
        requiredLicenses: ['E', 'C'],
    },
    {
        brand: 'Mercedes-Benz', family: 'Actros', trim: '1845', yearFrom: 2020, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '12800', powerHp: '450', baselineLPer100km: '27' },
        requiredLicenses: ['E', 'C'],
    },
    {
        brand: 'Hino', family: '700', trim: 'FS', yearFrom: 2019, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '10500', powerHp: '380', baselineLPer100km: '26' },
        requiredLicenses: ['E', 'C'],
    },
    {
        brand: 'Mack', family: 'Anthem', trim: '64T', yearFrom: 2022, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '13000', powerHp: '505', baselineLPer100km: '31' },
        requiredLicenses: ['E', 'C'],
    },

    // ===== Pesados PASAJEROS (D) =====
    {
        brand: 'Volvo', family: 'Buses', trim: 'B380R', yearFrom: 2020, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '10800', powerHp: '380', baselineLPer100km: '24' },
        requiredLicenses: ['D', 'B'],
    },
    {
        brand: 'Mercedes-Benz', family: 'OH', trim: '1621', yearFrom: 2018, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '7200', powerHp: '210', baselineLPer100km: '22' },
        requiredLicenses: ['D', 'B'],
    },
    {
        brand: 'King Long', family: 'XMQ', trim: '6129', yearFrom: 2021, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '10500', powerHp: '360', baselineLPer100km: '23' },
        requiredLicenses: ['D', 'B'],
    },

    // ===== Livianos COMERCIALES (C) =====
    {
        brand: 'Hyundai', family: 'H100', trim: 'Base', yearFrom: 2022, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.DIESEL, displacementCc: '2500', powerHp: '130', baselineLPer100km: '11' },
        requiredLicenses: ['C', 'B'],
    },
    {
        brand: 'Chevrolet', family: 'NQR', trim: '75', yearFrom: 2019, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.DIESEL, displacementCc: '5193', powerHp: '155', baselineLPer100km: '14' },
        requiredLicenses: ['C', 'B'],
    },
    {
        brand: 'JAC', family: 'Sunray', trim: 'Cargo', yearFrom: 2021, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.DIESEL, displacementCc: '2771', powerHp: '150', baselineLPer100km: '12' },
        requiredLicenses: ['C', 'B'],
    },
    {
        brand: 'Ford', family: 'Ranger', trim: '3.2 XL', yearFrom: 2022, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.DIESEL, displacementCc: '3198', powerHp: '200', baselineLPer100km: '10.5' },
        requiredLicenses: ['C', 'B'],
    },

    // ===== Livianos PARTICULARES (B) =====
    {
        brand: 'Chevrolet', family: 'D-Max', trim: '4x2', yearFrom: 2023, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.DIESEL, displacementCc: '3000', powerHp: '190', baselineLPer100km: '9.5' },
        requiredLicenses: ['B'],
    },
    {
        brand: 'Kia', family: 'Sportage', trim: 'LX', yearFrom: 2022, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.GASOLINE, displacementCc: '2000', powerHp: '153', baselineLPer100km: '8.5' },
        requiredLicenses: ['B'],
    },
    {
        brand: 'Toyota', family: 'Corolla', trim: '1.8', yearFrom: 2021, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.GASOLINE, displacementCc: '1800', powerHp: '138', baselineLPer100km: '7.2' },
        requiredLicenses: ['B'],
    },
    {
        brand: 'Nissan', family: 'Versa', trim: 'Sense', yearFrom: 2023, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.GASOLINE, displacementCc: '1600', powerHp: '118', baselineLPer100km: '6.9' },
        requiredLicenses: ['B'],
    },
    {
        brand: 'Mazda', family: '3', trim: 'Sedan 2.0', yearFrom: 2022, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.GASOLINE, displacementCc: '2000', powerHp: '155', baselineLPer100km: '7.8' },
        requiredLicenses: ['B'],
    },

    // ===== Motos (A) =====
    {
        brand: 'Yamaha', family: 'FZ', trim: '25', yearFrom: 2022, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.GASOLINE, displacementCc: '249', powerHp: '20', baselineLPer100km: '3.0' },
        requiredLicenses: ['A'],
    },
    {
        brand: 'Bajaj', family: 'Pulsar', trim: 'NS200', yearFrom: 2021, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.GASOLINE, displacementCc: '199', powerHp: '24', baselineLPer100km: '3.2' },
        requiredLicenses: ['A'],
    },

    // ===== Adaptado (F) =====
    {
        brand: 'Renault', family: 'Kangoo', trim: 'PCD', yearFrom: 2020, machineType: MachineType.LIGHT,
        engine: { engineType: EngineType.GASOLINE, displacementCc: '1600', powerHp: '110', baselineLPer100km: '7.8' },
        requiredLicenses: ['F'],
    },

    // ===== Agrícola (G) =====
    {
        brand: 'John Deere', family: '6M', trim: '6100M', yearFrom: 2019, machineType: MachineType.HEAVY,
        engine: { engineType: EngineType.DIESEL, displacementCc: '4500', powerHp: '100', baselineLPer100km: '12' },
        requiredLicenses: ['G'],
    },
];

/** 20 placas únicas */
const PLATES = [
    'PAA-0001','PAB-0002','PAC-0003','PAD-0004','PAE-0005',
    'PBA-0006','PBB-0007','PBC-0008','PBD-0009','PBE-0010',
    'PCA-0011','PCB-0012','PCC-0013','PCD-0014','PCE-0015',
    'PDA-0016','PDB-0017','PDC-0018','PDD-0019','PDE-0020',
];

/** Especificaciones de tanque/consumo por tipo */
function defaultsByMachineType(mt: MachineType) {
    if (mt === MachineType.HEAVY) return { tankL: '400', overrideL100: '30', calibK: '1.05' };
    return { tankL: '55', overrideL100: '8.5', calibK: '1.02' };
}

/** VIN incremental de 17 caracteres: TEST + 13 dígitos */
function generateVin(index: number) {
    const n = (index + 1).toString().padStart(13, '0');
    return `TEST${n}`; // 4 + 13 = 17
}

async function main() {
    for (let i = 0; i < MODELS.length; i++) {
        const m = MODELS[i];

        // 1) Modelo
        let model = await prisma.vehicleModel.findFirst({
            where: {
                brand: m.brand,
                family: m.family,
                trim: m.trim,
                yearFrom: m.yearFrom,
                yearTo: null,
                deletedAt: null,
            },
        });

        model ??= await prisma.vehicleModel.create({
            data: {
                brand: m.brand,
                family: m.family,
                trim: m.trim,
                yearFrom: m.yearFrom,
                yearTo: null,
                machineType: m.machineType,
            },
        });

        // 2) Motor
        await prisma.modelEngineSpec.upsert({
            where: { modelId: model.modelId },
            update: {
                engineType: m.engine.engineType,
                displacementCc: new Prisma.Decimal(m.engine.displacementCc),
                powerHp: new Prisma.Decimal(m.engine.powerHp),
                baselineLPer100km: new Prisma.Decimal(m.engine.baselineLPer100km),
            },
            create: {
                modelId: model.modelId,
                engineType: m.engine.engineType,
                displacementCc: new Prisma.Decimal(m.engine.displacementCc),
                powerHp: new Prisma.Decimal(m.engine.powerHp),
                baselineLPer100km: new Prisma.Decimal(m.engine.baselineLPer100km),
            },
        });

        // 3) Requisitos de licencia (modelo)
        for (const code of m.requiredLicenses) {
            await ensureModelLicenseRequirement(model.modelId, code, LICENSE_IDS[code] ?? null);
        }

        // 4) Unidad (1 por modelo) + VIN incremental
        const plate = PLATES[i];
        const targetVin = generateVin(i);

        let unit = await prisma.vehicleUnit.findFirst({ where: { plate, deletedAt: null } });

        if (!unit) {
            unit = await prisma.vehicleUnit.create({
                data: {
                    modelId: model.modelId,
                    plate,
                    serialVin: targetVin,
                    operationalStatus: OperationalStatus.ACTIVE,
                    tankCapacityL: new Prisma.Decimal(defaultsByMachineType(m.machineType).tankL),
                },
            });
        } else if (!unit.serialVin) {
            unit = await prisma.vehicleUnit.update({
                where: { vehicleId: unit.vehicleId },
                data: { serialVin: targetVin },
            });
        }

        // 5) Consumo unidad
        const def = defaultsByMachineType(m.machineType);
        await prisma.unitConsumptionSpec.upsert({
            where: { vehicleId: unit.vehicleId },
            update: {
                baselineOverrideLPer100km: new Prisma.Decimal(def.overrideL100),
                calibrationK: new Prisma.Decimal(def.calibK),
            },
            create: {
                vehicleId: unit.vehicleId,
                baselineOverrideLPer100km: new Prisma.Decimal(def.overrideL100),
                calibrationK: new Prisma.Decimal(def.calibK),
            },
        });

        // 6) Licencia a nivel unidad (principal)
        const primaryCode = m.requiredLicenses[0];
        await ensureUnitLicenseRequirement(unit.vehicleId, primaryCode, LICENSE_IDS[primaryCode] ?? null);
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
