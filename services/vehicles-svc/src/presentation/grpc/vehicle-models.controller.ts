import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { VehicleModelService } from '../../application/services/vehicle-model.service';
import { GrpcModelMapper } from '../../infra/grpc/mappers/model-grpc.mapper';
import { CreateModelDto } from '../../application/dto/vehicles-models/create-model.dto';
import { UpdateModelDto } from '../../application/dto/vehicles-models/update-model.dto';
import { GetModelByIdentityDto } from '../../application/dto/vehicles-models/get-model-by-identity.dto';
import { SetModelLicensesDto } from '../../application/dto/vehicles-models/set-model-licenses.dto';
import { DeleteModelLicenseDto } from '../../application/dto/vehicles-models/delete-model-license.dto';
import { ModelDtoMapper } from '../../application/mappers/model-dto.mapper';
import { LicenseDtoMapper } from '../../application/mappers/license-dto.mapper';

@Controller()
export class VehicleModelsController {
  constructor(private readonly modelSvc: VehicleModelService) {}

  @GrpcMethod('VehiclesService', 'ListModels')
  async listModels(): Promise<any> {
    const domainModels = await this.modelSvc.listAll();
    return { models: domainModels.map(GrpcModelMapper.toProto), page: { nextPageToken: '' } };
  }

  @GrpcMethod('VehiclesService', 'GetModel')
  async getModel(req: { modelId: string | number }): Promise<any> {
    const id = BigInt(req?.modelId);
    const vm = await this.modelSvc.getByIdOrThrow(id);
    return {
      model: GrpcModelMapper.toProto(vm),
      engine: GrpcModelMapper.toEngineProto(vm.engine),
      defaultLicenses: GrpcModelMapper.toLicensesProto(vm.defaultLicenses)
    };
  }

  @GrpcMethod('VehiclesService', 'GetModelByIdentity')
  async getModelByIdentity(dto: GetModelByIdentityDto): Promise<any> {
    const identity = ModelDtoMapper.toIdentityFromDto(dto);
    const vm = await this.modelSvc.getByIdentityOrThrow(identity);

    return {
      model: GrpcModelMapper.toProto(vm),
      engine: GrpcModelMapper.toEngineProto(vm.engine),
      defaultLicenses: GrpcModelMapper.toLicensesProto(vm.defaultLicenses)
    };
  }

  @GrpcMethod('VehiclesService', 'CreateModel')
  async createModel(dto: CreateModelDto): Promise<any> {
    const id = await this.modelSvc.createModel(dto);
    return { modelId: Number(id) };
  }

  @GrpcMethod('VehiclesService', 'UpdateModel')
  async updateModel(dto: UpdateModelDto): Promise<any> {
    console.log('🔍 [Controller RAW] DTO crudo antes de procesar:', dto);
    console.log('🔍 [Controller RAW] dto.engine antes de procesar:', dto.engine);
    console.log('🔍 [Controller RAW] Object.keys(dto):', Object.keys(dto));

    console.log('🔍 [Controller] DTO recibido:', JSON.stringify({...dto, engine: dto.engine ? 'EXISTS' : 'UNDEFINED'}, null, 2));
    console.log('🔍 [Controller] dto.engine:', dto.engine);
    console.log('🔍 [Controller] typeof dto.engine:', typeof dto.engine);

    const updateData = ModelDtoMapper.toDomainFromUpdate(dto);

    console.log('🔍 [Controller] updateData después del mapper:', JSON.stringify({...updateData, id: updateData.id.toString()}, null, 2));
    console.log('🔍 [Controller] updateData.engine:', updateData.engine);

    const updated = await this.modelSvc.updateModel(updateData);

    console.log('🔍 [Controller] Modelo actualizado ID:', updated.id.toString());

    return GrpcModelMapper.toProto(updated);
  }

  @GrpcMethod('VehiclesService', 'DeleteModel')
  async deleteModel(req: { modelId: string | number; expectedVersion?: string | number }): Promise<any> {
    const id = BigInt(req.modelId);
    const version = req.expectedVersion ? BigInt(req.expectedVersion) : undefined;
    await this.modelSvc.deleteModel(id, version);
    return {};
  }

  // ========== License Management ==========

  @GrpcMethod('VehiclesService', 'ListModelLicenseRequirements')
  async listModelLicenses(req: { modelId: string | number }): Promise<any> {
    const id = BigInt(req.modelId);
    const licenses = await this.modelSvc.listModelLicenses(id);
    return {
      licenses: LicenseDtoMapper.toGrpcArray(licenses)
    };
  }

  @GrpcMethod('VehiclesService', 'SetModelLicenseRequirements')
  async setModelLicenses(req: { modelId: string | number; licenses: any[] }): Promise<any> {
    const id = BigInt(req.modelId);
    const domainLicenses = LicenseDtoMapper.fromGrpcArray(req.licenses || []);

    const result = await this.modelSvc.setModelLicenses(id, domainLicenses);

    return {
      licenses: LicenseDtoMapper.toGrpcArray(result)
    };
  }

  @GrpcMethod('VehiclesService', 'DeleteModelLicenseRequirement')
  async deleteModelLicense(req: {
    modelId: string | number;
    licenseTypeCode?: string;
    licenseTypeId?: string | number;
  }): Promise<any> {
    const id = BigInt(req.modelId);
    const licenseRef = LicenseDtoMapper.fromGrpc({
      licenseTypeCode: req.licenseTypeCode,
      licenseTypeId: req.licenseTypeId,
    });

    const remaining = await this.modelSvc.deleteModelLicense(id, licenseRef);

    return {
      remainingLicenses: LicenseDtoMapper.toGrpcArray(remaining)
    };
  }
}
