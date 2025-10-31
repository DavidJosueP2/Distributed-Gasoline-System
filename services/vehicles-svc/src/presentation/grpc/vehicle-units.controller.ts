import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { VehicleUnitService } from '../../application/services/vehicle-unit.service';
import { GrpcUnitMapper } from '../../infra/grpc/mappers/unit-grpc.mapper';
import { CreateUnitDto, UpdateUnitStatusDto, UpsertUnitConsumptionDto, UpdateUnitDto } from '../../application/dto/unit-vehicle';
import { UnitDtoMapper } from '../../application/mappers/unit-dto.mapper';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { MachineType } from '../../domain/value-objects/machine-type';

@Controller()
export class VehicleUnitsController {
  constructor(private readonly unitSvc: VehicleUnitService) {}

  @GrpcMethod('VehiclesService', 'ListUnits')
  async listUnits(req?: { machineTypeFilter?: number | string }): Promise<any> {
    let machineTypeFilter: MachineType | undefined;
    const filter = req?.machineTypeFilter;
    
    // Manejar tanto número como string (gRPC puede enviar cualquiera de los dos)
    if (filter === 1 || filter === 'LIGHT') {
      machineTypeFilter = MachineType.LIGHT;
    } else if (filter === 2 || filter === 'HEAVY') {
      machineTypeFilter = MachineType.HEAVY;
    }
    
    const units = await this.unitSvc.listAll(machineTypeFilter);
    return { units: units.map(GrpcUnitMapper.toProto), page: { nextPageToken: '' } };
  }

  @GrpcMethod('VehiclesService', 'GetUnit')
  async getUnit(request: any): Promise<any> {
    const vehicleId = request.vehicleId ? BigInt(request.vehicleId) : undefined;
    const plate = request.plate ? String(request.plate) : undefined;
    const serialVin = request.serialVin ? String(request.serialVin) : undefined;
    const unit = await this.unitSvc.getUnitByAny({ vehicleId, plate, serialVin });
    if (!unit) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Unidad no encontrada' });
    return { unit: GrpcUnitMapper.toProto(unit), requiredLicenses: [] };
  }

  @GrpcMethod('VehiclesService', 'CreateUnit')
  async createUnit(dto: CreateUnitDto): Promise<any> {
    const input = UnitDtoMapper.toCreateInput(dto);
    const id = await this.unitSvc.createUnit(input);
    return { vehicleId: Number(id) };
  }

  @GrpcMethod('VehiclesService', 'UpdateUnit')
  async updateUnit(dto: UpdateUnitDto): Promise<any> {
    const input = UnitDtoMapper.toUpdateInput(dto as any);
    const updated = await this.unitSvc.updateUnit(input as any);
    return GrpcUnitMapper.toProto(updated);
  }

  @GrpcMethod('VehiclesService', 'UpdateUnitStatus')
  async updateUnitStatus(dto: UpdateUnitStatusDto): Promise<any> {
    let vehicleId: bigint | null = undefined as any;
    if (dto.vehicleId) {
      vehicleId = BigInt(dto.vehicleId);
    } else if (dto.plate) {
      vehicleId = await this.unitSvc.findIdByPlate(dto.plate);
    }
    if (!vehicleId) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Unidad no encontrada' });

    const input = UnitDtoMapper.toUpdateStatusInput({ ...dto, vehicleId: String(vehicleId) } as any);
    await this.unitSvc.updateStatus(input as any);
    return ts(new Date());
  }

  @GrpcMethod('VehiclesService', 'UpsertUnitConsumption')
  async upsertConsumption(dto: UpsertUnitConsumptionDto): Promise<any> {
    const input = UnitDtoMapper.toUpsertConsumptionInput(dto);
    await this.unitSvc.upsertConsumption(input as any);
    const reloaded = await this.unitSvc.getUnitByAny({ vehicleId: input.vehicleId });
    if (!reloaded) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Unidad no encontrada' });
    return GrpcUnitMapper.toConsumptionProto(reloaded);
  }

  @GrpcMethod('VehiclesService', 'DeleteUnit')
  async deleteUnit(request: any): Promise<any> {
    let vehicleId: bigint | undefined;
    if (request.vehicleId) vehicleId = BigInt(request.vehicleId);
    const plate = request.plate ? String(request.plate) : undefined;
    const when = await this.unitSvc.deleteUnit({ vehicleId, plate });
    return { deletedAt: ts(when), deleted_at: ts(when) } as any; // proto espera deleted_at; agregamos alias
  }

  @GrpcMethod('VehiclesService', 'GetUnitConsumptionProfile')
  async getUnitConsumptionProfile(request: any): Promise<any> {
    const vehicleId = request.vehicleId ? BigInt(request.vehicleId) : undefined;
    const plate = request.plate ? String(request.plate) : undefined;
    const profile = await this.unitSvc.getConsumptionProfile({ vehicleId, plate });
    return GrpcUnitMapper.toConsumptionProfileProto(profile);
  }
}

function ts(d: Date) {
  return { seconds: Math.floor(d.getTime() / 1000), nanos: (d.getTime() % 1000) * 1e6 };
}
