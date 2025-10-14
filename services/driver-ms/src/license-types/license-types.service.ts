import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLicenseTypeDto } from './dto/create-license-type.dto';
import { UpdateLicenseTypeDto } from './dto/update-license-type.dto';
import { LicenseType } from './entities/license-type.entity';
import { LicenseInclude } from './entities/license-include.entity';

export interface ClosureResult {
  child_id: number;
}

@Injectable()
export class LicenseTypesService {
  constructor(
    @InjectRepository(LicenseType)
    private readonly licenseTypeRepository: Repository<LicenseType>,

    @InjectRepository(LicenseInclude)
    private readonly licenseIncludeRepository: Repository<LicenseInclude>,
  ) {}

private convertGrpcId(id: any): number {
  console.log('🔍 convertGrpcId - Input:', id, 'Type:', typeof id);
  
  // Si es null o undefined
  if (id === null || id === undefined) {
    return 0;
  }
  
  // Si es un objeto Long de gRPC (típicamente tiene propiedades 'low', 'high', 'unsigned')
  if (typeof id === 'object') {
    // Formato típico de Long en gRPC
    if ('low' in id) {
      const result = Number(id.low) || 0;
      console.log('🔍 convertGrpcId - Converted from Long:', result);
      return result;
    }
    
    // Otros objetos, intentar extraer un valor numérico
    const jsonStr = JSON.stringify(id);
    console.log('🔍 convertGrpcId - Object stringified:', jsonStr);
    
    // Intentar parsear como número
    const parsed = parseInt(jsonStr);
    if (!isNaN(parsed)) {
      console.log('🔍 convertGrpcId - Parsed from object:', parsed);
      return parsed;
    }
    
    return 0;
  }
  
  // Si es un string, convertir a número
  if (typeof id === 'string') {
    const parsed = parseInt(id);
    if (!isNaN(parsed)) {
      console.log('🔍 convertGrpcId - Parsed from string:', parsed);
      return parsed;
    }
    return 0;
  }
  
  // Si ya es un número
  if (typeof id === 'number') {
    return id;
  }
  
  // Último recurso
  const result = Number(id) || 0;
  console.log('🔍 convertGrpcId - Converted with Number():', result);
  return result;
}


  async create(dto: CreateLicenseTypeDto): Promise<LicenseType> {
  console.log("🔧 Service.create - DTO received:", JSON.stringify(dto, null, 2));
  console.log("🔧 Service.create - is_professional:", dto.is_professional, "type:", typeof dto.is_professional);
  
  const licenseType = this.licenseTypeRepository.create({
    code: dto.code,
    description: dto.description,
    is_professional: dto.is_professional ?? false,
  });

  console.log("🔧 Service.create - Entity before save:", JSON.stringify(licenseType, null, 2));
  const saved = await this.licenseTypeRepository.save(licenseType);
  console.log("🔧 Service.create - Entity after save:", JSON.stringify(saved, null, 2));
  
  return saved;
}

  async findAll(): Promise<LicenseType[]> {
    return await this.licenseTypeRepository.find({
      relations: ['parentIncludes', 'childIncludes'],
    });
  }

  async findOne(id: number): Promise<LicenseType> {
    const licenseType = await this.licenseTypeRepository.findOne({
      where: { license_type_id: id },
      relations: ['parentIncludes', 'childIncludes', 'driverLicenses'],
    });

    if (!licenseType) {
      throw new NotFoundException(`LicenseType with ID ${id} not found`);
    }

    return licenseType;
  }

  async findByCode(code: string): Promise<LicenseType> {
    const licenseType = await this.licenseTypeRepository.findOne({
      where: { code },
      relations: ['parentIncludes', 'childIncludes', 'driverLicenses'],
    });

    if (!licenseType) {
      throw new NotFoundException(`LicenseType with code ${code} not found`);
    }

    return licenseType;
  }

  async update(
  id: any,
  updateLicenseTypeDto: UpdateLicenseTypeDto,
): Promise<LicenseType> {
  const convertedId = this.convertGrpcId(id);
  
  // Find the entity first
  const licenseType = await this.findOne(convertedId);

  // If the update includes a 'code', ensure it's not already used by a different record
  if (updateLicenseTypeDto?.code !== undefined && updateLicenseTypeDto.code !== licenseType.code) {
    const existing = await this.licenseTypeRepository.findOne({
      where: { code: updateLicenseTypeDto.code },
    });
    if (existing && existing.license_type_id !== convertedId) {
      throw new BadRequestException(
        `LicenseType code '${updateLicenseTypeDto.code}' is already in use by id ${existing.license_type_id}`,
      );
    }
  }

  // Map DTO properties to Entity (both use snake_case)
  if (updateLicenseTypeDto.code !== undefined) {
    licenseType.code = updateLicenseTypeDto.code;
  }
  if (updateLicenseTypeDto.description !== undefined) {
    licenseType.description = updateLicenseTypeDto.description;
  }
  if (updateLicenseTypeDto.is_professional !== undefined) {
    licenseType.is_professional = updateLicenseTypeDto.is_professional;
  }
  
  // Save the updated entity
  return await this.licenseTypeRepository.save(licenseType);
}

  async remove(id: any): Promise<void> {  // Cambiar de number a any
  const convertedId = this.convertGrpcId(id);
  
  const result = await this.licenseTypeRepository.delete(convertedId);

  if (result.affected === 0) {
    throw new NotFoundException(`LicenseType with ID ${convertedId} not found`);
  }
}

  // Métodos específicos para LicenseIncludes
 async addLicenseInclusion(
  parentId: any,
  childId: any,
): Promise<LicenseInclude> {
  console.log('🔍 addLicenseInclusion - Raw IDs:', {
    rawParentId: parentId,
    rawChildId: childId,
    parentIdType: typeof parentId,
    childIdType: typeof childId,
    parentIdJSON: typeof parentId === 'object' ? JSON.stringify(parentId) : parentId,
    childIdJSON: typeof childId === 'object' ? JSON.stringify(childId) : childId
  });
  
  const convertedParentId = this.convertGrpcId(parentId);
  const convertedChildId = this.convertGrpcId(childId);
  
  console.log('🔍 addLicenseInclusion - Converted IDs:', {
    convertedParentId,
    convertedChildId,
    areEqual: convertedParentId === convertedChildId
  });
  
  if (convertedParentId === convertedChildId) {
    throw new BadRequestException('parentId and childId must be different');
  }

  // Ensure both license types exist
  const parent = await this.licenseTypeRepository.findOne({
    where: { license_type_id: convertedParentId },
  });
  const child = await this.licenseTypeRepository.findOne({
    where: { license_type_id: convertedChildId },
  });

  if (!parent) {
    throw new NotFoundException(`Parent license type ${convertedParentId} not found`);
  }
  if (!child) {
    throw new NotFoundException(`Child license type ${convertedChildId} not found`);
  }

  // ✅ Usar los IDs convertidos aquí
  const existing = await this.licenseIncludeRepository.findOne({
    where: {
      parent_license_type_id: convertedParentId,  // ← converted
      child_license_type_id: convertedChildId,    // ← converted
    },
  });
  if (existing) return existing;

  // ✅ Usar los IDs convertidos aquí también
  await this.licenseIncludeRepository
    .createQueryBuilder()
    .insert()
    .into(LicenseInclude)
    .values({
      parent_license_type_id: convertedParentId,  // ← converted
      child_license_type_id: convertedChildId,    // ← converted
    })
    .orIgnore()
    .execute();

  // ✅ Y aquí también
  const inclusion = await this.licenseIncludeRepository.findOne({
    where: {
      parent_license_type_id: convertedParentId,  // ← converted
      child_license_type_id: convertedChildId,    // ← converted
    },
  });

  if (!inclusion) {
    throw new NotFoundException('License inclusion not found after insert');
  }

  return inclusion;
}

  
async removeLicenseInclusion(
  parentId: any,  // Cambiar a any
  childId: any,   // Cambiar a any
): Promise<void> {
  const convertedParentId = this.convertGrpcId(parentId);
  const convertedChildId = this.convertGrpcId(childId);
  
  const result = await this.licenseIncludeRepository.delete({
    parent_license_type_id: convertedParentId,
    child_license_type_id: convertedChildId,
  });

  if (result.affected === 0) {
    throw new NotFoundException('License inclusion not found');
  }
}

 async getLicenseClosure(licenseTypeId: any): Promise<number[]> {
  const convertedId = this.convertGrpcId(licenseTypeId);
  
  console.log('🔍 Checking closure for license type:', convertedId);
  
  try {
    // SOLO usar CTE - eliminar la parte de mv_license_closure
    type ClosureRow = { child_id: number };
    const rows = await this.licenseTypeRepository.query<ClosureRow[]>(`
      WITH RECURSIVE closure AS (
        SELECT child_license_type_id AS child_id
        FROM license_includes
        WHERE parent_license_type_id = $1
        
        UNION
        
        SELECT li.child_license_type_id AS child_id
        FROM license_includes li
        INNER JOIN closure c ON li.parent_license_type_id = c.child_id
      )
      SELECT DISTINCT child_id FROM closure
    `, [convertedId]);

    console.log('🔍 Result from CTE:', rows);
    return rows.map((r) => r.child_id);
    
  } catch (err: unknown) {
    console.error('❌ Error in getLicenseClosure:', err);
    const msg = err && typeof err === 'object' && 'message' in err 
      ? String((err as any).message) 
      : String(err);
    throw new InternalServerErrorException(`Failed to compute license closure: ${msg}`);
  }
}
}
