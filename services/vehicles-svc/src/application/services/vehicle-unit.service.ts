import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '../tokens';
import type { VehicleUnitRepository, Tx } from '../../domain/repositories/vehicle-unit.repository';
import type { UnitConsumptionSpecsRepository } from '../../domain/repositories/unit-consumption-specs.repository';
import type { VehicleModelRepository } from '../../domain/repositories/vehicle-model.repository';
import { TransactionManager } from '../../db/prisma/transaction.manager';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { VehicleUnit, MachineType } from '../../domain';
import { createPlate } from '../../domain/value-objects/plate';
import { CalibrationKCalculator } from '../../domain/services/calibration-k-calculator.service';
import { OperationalStatus, toOperationalStatus, isValidOperationalStatus } from '../../domain/value-objects/operational-status';
import { GrpcClientFactory } from '../../infra/grpc/grpc-client.factory';
import { RoutesClient } from '../../infra/grpc/clients/routes.client';

interface CreateUnitInput {
  modelId: bigint;
  plate: string;
  serialVin?: string | null;
  tankCapacityL?: number | null;
  odometerKm?: number | null;
  consumption?: { baselineOverrideLPer100Km?: number } | null; // calibrationK removido - se calcula automáticamente
  extraLicenses?: { code?: string; id?: bigint }[];
}

interface UpdateUnitStatusInput { vehicleId: bigint; newStatus: string; }
interface UpsertConsumptionInput {
  vehicleId: bigint;
  baselineOverrideLPer100Km?: number | null;
  // calibrationK removido - se recalcula automáticamente
}
interface UpdateUnitInput { vehicleId: bigint; plate?: string; tankCapacityL?: number | null; odometerKm?: number | null; }

@Injectable()
export class VehicleUnitService {
  constructor(
    private readonly txm: TransactionManager,
    @Inject(TOKENS.VehicleUnitRepository)
    private readonly unitRepo: VehicleUnitRepository,
    @Inject(TOKENS.UnitConsumptionSpecsRepository)
    private readonly consRepo: UnitConsumptionSpecsRepository,
    @Inject(TOKENS.VehicleModelRepository)
    private readonly modelRepo: VehicleModelRepository,
    private readonly grpcFactory: GrpcClientFactory,
  ) {}

  private async routesClient(): Promise<RoutesClient> {
    const client = await this.grpcFactory.clientFor(
      'ROUTES-SERVICE',
      'routes.v1',
      'routes.proto',
    );
    return new RoutesClient(client);
  }

  async listAll(machineTypeFilter?: MachineType) {
    return this.unitRepo.listAll(machineTypeFilter);
  }

  async listAllWithDetails(filters?: {
    machineTypeFilter?: MachineType;
    licenseTypeCodesFilter?: string[];
    statusFilter?: string;
    platePrefix?: string;
    modelIdFilter?: bigint;
  }) {
    return this.unitRepo.listAllWithDetails(filters);
  }

  async createUnit(input: CreateUnitInput): Promise<bigint> {
    // Validaciones básicas ANTES de la transacción (solo de formato)
    const serialVin: string | null = (input.serialVin?.trim() || '') || null;

    const tankCapacity = input.tankCapacityL ?? 0;
    if (tankCapacity <= 0) {
      throw new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message: 'La capacidad del tanque debe ser mayor a 0' });
    }

    // TODO: Validar cada licencia (input.extraLicenses) vía gRPC al microservicio de licencias/conductores
    //       antes de persistir; si alguna no existe o no aplica, devolver RpcException INVALID_ARGUMENT

    // INICIAR TRANSACCIÓN - Todo dentro para garantizar atomicidad
    return this.txm.runInTx(async (tx) => {
      // 1. Validar que el modelo exista
      const model = await this.modelRepo.findById(input.modelId, tx);
      if (!model) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'El modelo de vehículo no existe' });

      const modelBaseline = model.engine?.baselineLPer100km;
      if (!modelBaseline) {
        throw new RpcException({ code: GrpcStatus.FAILED_PRECONDITION, message: 'El modelo no tiene especificaciones de motor definidas' });
      }

      // 2. Validar unicidad de VIN (DENTRO de la transacción)
      if (serialVin && await this.unitRepo.existsSerialVin(serialVin, tx)) {
        throw new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message: 'El número de serie VIN ya está registrado' });
      }

      // 3. Validar unicidad de placa (DENTRO de la transacción)
      if (await this.unitRepo.existsPlate(input.plate, tx)) {
        throw new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message: 'La placa ya está registrada' });
      }

      // 4. Crear la unidad
      const unit: VehicleUnit = {
        id: 0n as any,
        modelId: input.modelId,
        plate: createPlate(input.plate),
        serialVin: serialVin,
        operationalStatus: OperationalStatus.ACTIVE,
        tankCapacityL: tankCapacity,
        odometerKm: input.odometerKm ?? 0,
        createdAt: undefined,
        updatedAt: undefined,
        version: undefined,
        consumption: undefined,
        extraLicenses: undefined,
      };
      const id = await this.unitRepo.create(unit, tx);

      // 5. CALCULAR automáticamente el factor K
      const calibrationK = CalibrationKCalculator.calculate(model.yearFrom, unit.odometerKm);
      const calcDetails = CalibrationKCalculator.calculateWithDetails(model.yearFrom, unit.odometerKm);
      console.log(`[CalibrationK] Unidad ${id} - ${calcDetails.details}`);

      // 6. Crear el consumption spec (DENTRO de la transacción)
      // Si el usuario envió un override explícito, guardarlo. Si no, usar el baseline del modelo
      const baselineOverride = input.consumption?.baselineOverrideLPer100Km ?? modelBaseline;

      await this.consRepo.upsert({
        vehicleId: String(id),
        baselineOverrideLPer100Km: baselineOverride,
        calibrationK,
        modelBaselineLPer100Km: modelBaseline,
      }, tx as any);

      // 7. TODO: Crear las licencias extra si las hay
      // if (input.extraLicenses && input.extraLicenses.length > 0) {
      //   await this.unitLicenseRepo.createMany(id, input.extraLicenses, tx);
      // }

      return id;
    });
  }

  async updateStatus(input: UpdateUnitStatusInput): Promise<void> {
    const unit = await this.unitRepo.findById(input.vehicleId);
    if (!unit) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'La unidad de vehículo no fue encontrada' });
    if (!input.newStatus) throw this.invalid('El estado es requerido');

    // Validar que el estado sea válido usando la función de validación
    if (!isValidOperationalStatus(input.newStatus)) {
      throw this.invalid(`Estado inválido: ${input.newStatus}. Estados válidos: ACTIVE, MAINTENANCE, RETIRED, ON_ROUTE`);
    }

    unit.operationalStatus = toOperationalStatus(input.newStatus);
    await this.unitRepo.update(unit);
  }

  async upsertConsumption(input: UpsertConsumptionInput): Promise<void> {
    const unit = await this.unitRepo.findById(input.vehicleId);
    if (!unit) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'La unidad de vehículo no fue encontrada' });

    let baselineOverride = input.baselineOverrideLPer100Km;
    if (baselineOverride == null) {
      const model = await this.modelRepo.findById(unit.modelId);
      if (!model?.engine?.baselineLPer100km) {
        throw new RpcException({ code: GrpcStatus.FAILED_PRECONDITION, message: 'El modelo no tiene especificaciones de motor y no se proporcionó un valor de consumo base' });
      }
      baselineOverride = model.engine.baselineLPer100km;
    }

    const model = await this.modelRepo.findById(unit.modelId);
    if (!model) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'El modelo de vehículo no existe' });

    const calibrationK = CalibrationKCalculator.calculate(model.yearFrom, unit.odometerKm ?? 0);
    const calcDetails = CalibrationKCalculator.calculateWithDetails(model.yearFrom, unit.odometerKm ?? 0);
    console.log(`[CalibrationK] Actualización Unidad ${input.vehicleId} - ${calcDetails.details}`);

    await this.consRepo.upsert({
      vehicleId: String(input.vehicleId),
      baselineOverrideLPer100Km: baselineOverride,
      calibrationK,
      modelBaselineLPer100Km: unit.consumption?.modelBaselineLPer100Km,
    });
  }

  async updateUnit(input: UpdateUnitInput): Promise<VehicleUnit> {
    const unit = await this.unitRepo.findById(input.vehicleId);
    if (!unit) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'La unidad de vehículo no fue encontrada' });
    let changed = false;
    let odometerChanged = false;

    if (input.plate && input.plate !== unit.plate) {
      const newPlate = input.plate.toUpperCase();
      if (await this.unitRepo.existsPlate(newPlate)) {
        throw new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message: 'La placa ya está registrada en otra unidad' });
      }
      unit.plate = createPlate(newPlate);
      changed = true;
    }

    if (input.tankCapacityL !== undefined && input.tankCapacityL !== null) {
      unit.tankCapacityL = input.tankCapacityL;
      changed = true;
    }

    if (input.odometerKm !== undefined && input.odometerKm !== null) {
      const currentOdometer = unit.odometerKm ?? 0;

      if (input.odometerKm < currentOdometer) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: `El odómetro no puede ser menor al valor actual. Valor actual: ${currentOdometer} km, valor enviado: ${input.odometerKm} km`
        });
      }

      if (input.odometerKm !== currentOdometer) {
        unit.odometerKm = input.odometerKm;
        changed = true;
        odometerChanged = true;
      }
    }

    if (!changed) return unit;

    await this.unitRepo.update(unit);

    if (odometerChanged) {
      const model = await this.modelRepo.findById(unit.modelId);
      if (model && unit.consumption) {
        const calibrationK = CalibrationKCalculator.calculate(model.yearFrom, unit.odometerKm ?? 0);
        const calcDetails = CalibrationKCalculator.calculateWithDetails(model.yearFrom, unit.odometerKm ?? 0);
        console.log(`[CalibrationK] Actualización odómetro Unidad ${input.vehicleId} - ${calcDetails.details}`);

        await this.consRepo.upsert({
          vehicleId: String(unit.id),
          baselineOverrideLPer100Km: unit.consumption.baselineOverrideLPer100Km,
          calibrationK,
          modelBaselineLPer100Km: unit.consumption.modelBaselineLPer100Km,
        });
      }
    }

    return (await this.unitRepo.findById(unit.id))!;
  }

  async findIdByPlate(plate: string): Promise<bigint | null> {
    if (!plate) return null;
    const unit = await this.unitRepo.findByPlate(plate.toUpperCase());
    return unit ? unit.id : null;
  }

  async findBySerialVin(serialVin: string) {
    if (!serialVin) return null;
    return this.unitRepo.findBySerialVin(serialVin);
  }

  async getUnitByAny(params: { vehicleId?: bigint; plate?: string; serialVin?: string }): Promise<VehicleUnit | null> {
    if (params.vehicleId) {
      return await this.unitRepo.findById(params.vehicleId);
    }
    if (params.plate) {
      return await this.unitRepo.findByPlate(params.plate.toUpperCase());
    }
    if (params.serialVin) {
      return await this.unitRepo.findBySerialVin(params.serialVin);
    }
    return null;
  }

  async deleteUnit(params: { vehicleId?: bigint; plate?: string }): Promise<Date> {
    let unit: VehicleUnit | null = null;
    if (params.vehicleId) {
      unit = await this.unitRepo.findById(params.vehicleId);
    } else if (params.plate) {
      unit = await this.unitRepo.findByPlate(params.plate.toUpperCase());
    } else {
      throw this.invalid('Debe proporcionar el ID del vehículo o la placa');
    }
    if (!unit) {
      return new Date();
    }
    if (unit.deletedAt) {
      return unit.deletedAt;
    }

    // Validar que no tenga viajes asociados
    try {
      const routesClient = await this.routesClient();
      const hasTrips = await routesClient.hasTripsByVehicle(Number(unit.id));
      
      if (hasTrips) {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: `No se puede eliminar el vehículo con ID ${unit.id} porque tiene viajes asociados. Debe finalizar o reasignar todos los viajes antes de eliminar el vehículo.`,
        });
      }
    } catch (error) {
      // Si el error es RpcException, re-lanzarlo
      if (error instanceof RpcException) {
        throw error;
      }
      // Si hay error de conexión con routes-srv, loguear pero permitir la eliminación
      // (no tenemos logger aquí, pero podemos usar console)
      console.warn(
        `Error al verificar viajes del vehículo ${unit.id}: ${error instanceof Error ? error.message : 'Error desconocido'}. Continuando con la eliminación.`,
      );
    }

    const when = await this.unitRepo.softDelete(unit.id);
    return when;
  }

  async getConsumptionProfile(params: { vehicleId?: bigint; plate?: string }) {
    let unit: VehicleUnit | null = null;
    if (params.vehicleId) {
      unit = await this.unitRepo.findById(params.vehicleId);
    } else if (params.plate) {
      unit = await this.unitRepo.findByPlate(params.plate.toUpperCase());
    } else {
      throw this.invalid('Debe proporcionar el ID del vehículo o la placa');
    }

    if (!unit) {
      throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'La unidad de vehículo no fue encontrada' });
    }

    const model = await this.modelRepo.findById(unit.modelId);
    if (!model) {
      throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'El modelo de vehículo no fue encontrado' });
    }

    const baselineModel = unit.consumption?.modelBaselineLPer100Km ?? 0;
    const baselineOverride = unit.consumption?.baselineOverrideLPer100Km ?? 0;
    const calibrationK = unit.consumption?.calibrationK ?? 1;
    // effective = (override ?? baseline_model) * calibration_k
    const baselineToUse = baselineOverride > 0 ? baselineOverride : baselineModel;
    const effective = baselineToUse * calibrationK;

    return {
      vehicleId: unit.id,
      baselineModelLPer100km: baselineModel,
      calibrationK,
      effectiveLPer100km: effective,
      baselineOverrideLPer100km: baselineOverride,
      engineType: unit.consumption?.engineType,
      vehicleYear: model.yearFrom,
      odometerKm: unit.odometerKm ?? 0,
    };
  }

  private invalid(message: string) {
    return new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message });
  }
}
