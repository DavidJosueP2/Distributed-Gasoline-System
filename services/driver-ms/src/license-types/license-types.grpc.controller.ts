import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { LicenseTypesService } from './license-types.service';
import { LicenseTypesGrpcMapper, mapLicenseTypeFlat } from './mappers/license-types-grpc.mapper';

@Controller()
export class LicenseTypesGrpcController {
  constructor(private readonly service: LicenseTypesService) {}

  @GrpcMethod('LicenseTypesService', 'Create')
  async create(data: any) {
    console.log("📨 Create - Incoming data:", JSON.stringify(data, null, 2));
    console.log("📨 Create - isProfessional (camelCase):", data.isProfessional, "type:", typeof data.isProfessional);
    console.log("📨 Create - is_professional (snake_case):", data.is_professional, "type:", typeof data.is_professional);
    
    // gRPC convierte automáticamente snake_case del proto a camelCase
    // Necesitamos convertir de vuelta a snake_case para el DTO
    const dto = {
      code: data.code,
      description: data.description,
      is_professional: data.isProfessional ?? data.is_professional,
    };
    
    console.log("📨 Create - DTO transformed:", JSON.stringify(dto, null, 2));
    
    const result = await this.service.create(dto).then(mapLicenseTypeFlat as any);
    console.log("✅ Create - Service result:", result);
    
    const beforeResponse = LicenseTypesGrpcMapper.mapLicenseTypeForGrpc(result);
    console.log("📤 Create - Final response:", beforeResponse);
    return beforeResponse;
  }

  @GrpcMethod('LicenseTypesService', 'FindAll')
  async findAll() {
    const items = await this.service.findAll();
    return LicenseTypesGrpcMapper.mapFindAllResponse(items);
  }

  @GrpcMethod('LicenseTypesService', 'FindOne')
  async findOne(data: { id: any }) {
    try {
      const id = LicenseTypesGrpcMapper.extractLicenseTypeId(data);
      const result = await this.service.findOne(id);
      console.log("El servicio retorna esto: ");
      console.log(result);
      if (!result) {
        throw new RpcException('License type not found');
      }

      const mapedResult = LicenseTypesGrpcMapper.mapLicenseTypeForGrpc(result);
      console.log(mapedResult);
      return mapedResult;
    } catch (error) {
      console.error('Error in findOne:', error);
      throw new RpcException('Internal server error');
    }
  }

  @GrpcMethod('LicenseTypesService', 'FindByCode')
  async findByCode(data: { code: string }) {
    try {
      const result = await this.service.findByCode(data.code);
      console.log("Data traida del servicio");
      console.log(result);
      if (!result) {
        throw new RpcException('License type not found');
      }

      const mapedResult = LicenseTypesGrpcMapper.mapLicenseTypeForGrpc(result);
      console.log(mapedResult);
      return mapedResult;
    } catch (error) {
      return null;
    }
  }

  @GrpcMethod('LicenseTypesService', 'Update')
  async update(data: any) {
    console.log("📨 Update - Incoming data:", JSON.stringify(data, null, 2));
    console.log("📨 Update - isProfessional (camelCase):", data.isProfessional, "type:", typeof data.isProfessional);
    console.log("📨 Update - is_professional (snake_case):", data.is_professional, "type:", typeof data.is_professional);
    
    // gRPC convierte automáticamente snake_case del proto a camelCase
    // Necesitamos convertir de vuelta a snake_case para el DTO
    const dto = {
      code: data.code,
      description: data.description,
      is_professional: data.isProfessional ?? data.is_professional,
    };
    
    console.log("📨 Update - DTO transformed:", JSON.stringify(dto, null, 2));
    
    const result = await this.service.update(data.id, dto);
    
    console.log("✅ Update - Service result:", JSON.stringify(result, null, 2));
    
    return LicenseTypesGrpcMapper.mapLicenseTypeForGrpc(result);
  }

  @GrpcMethod('LicenseTypesService', 'Remove')
  async remove(data: any) {
    try {
      console.log('📨 Remove - COMPLETE DATA:', JSON.stringify(data, null, 2));
      const id = LicenseTypesGrpcMapper.extractLicenseTypeId(data);
      console.log('📨 Remove - Final ID:', { id });
      await this.service.remove(id);
      console.log('✅ Remove - Successfully removed');
      return LicenseTypesGrpcMapper.mapRemoveResponse();
    } catch (error) {
      console.error('❌ Remove - Error:', error);
      throw new RpcException(error.message || 'Error removing license type');
    }
  }

  @GrpcMethod('LicenseTypesService', 'AddInclusion')
  async addInclusion(data: any) {
    try {
      console.log('📨 AddInclusion - COMPLETE DATA:', JSON.stringify(data, null, 2));
      const { parentId, childId } = LicenseTypesGrpcMapper.extractParentAndChildIds(data);
      console.log('📨 AddInclusion - Final IDs:', { parentId, childId });
      const result = await this.service.addLicenseInclusion(parentId, childId);
      console.log('✅ AddInclusion - Service result:', result);
      return LicenseTypesGrpcMapper.mapAddInclusionResponse(result);
    } catch (error) {
      console.error('❌ AddInclusion - Error:', error);
      throw new RpcException(error.message || 'Error adding inclusion');
    }
  }

  @GrpcMethod('LicenseTypesService', 'RemoveInclusion')
  async removeInclusion(data: any) {
    try {
      console.log('📨 RemoveInclusion - COMPLETE DATA:', JSON.stringify(data, null, 2));
      const { parentId, childId } = LicenseTypesGrpcMapper.extractParentAndChildIds(data);
      console.log('📨 RemoveInclusion - Final IDs:', { parentId, childId });
      await this.service.removeLicenseInclusion(parentId, childId);
      console.log('✅ RemoveInclusion - Successfully removed');
      return LicenseTypesGrpcMapper.mapRemoveInclusionResponse();
    } catch (error) {
      console.error('❌ RemoveInclusion - Error:', error);
      throw new RpcException(error.message || 'Error removing inclusion');
    }
  }

  @GrpcMethod('LicenseTypesService', 'GetClosure')
  async getClosure(data: any) {
    try {
      console.log('📨 GetClosure - COMPLETE DATA:', JSON.stringify(data, null, 2));
      const licenseTypeId = LicenseTypesGrpcMapper.extractLicenseTypeIdForClosure(data);
      const child_ids = await this.service.getLicenseClosure(licenseTypeId);
      console.log('✅ GetClosure - Service result:', child_ids);
      const responseProto = LicenseTypesGrpcMapper.mapGetClosureResponse(child_ids);
      console.log('🔍 Response structure for gRPC:', {
        raw: responseProto,
        stringified: JSON.stringify(responseProto),
        type: typeof responseProto.childIds?.[0]
      });
      return responseProto;
    } catch (error) {
      console.error('❌ GetClosure - Error:', error);
      throw new RpcException(error.message || 'Error getting license closure');
    }
  }
} 