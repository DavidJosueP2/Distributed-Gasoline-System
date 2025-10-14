import { RpcException } from '@nestjs/microservices';

export class LicenseTypesGrpcMapper {
  // Método para convertir IDs de gRPC
  static convertGrpcId(id: any): number {
    if (typeof id === 'object' && id !== null) {
      return Number(id.low) || Number(id.high) || 0;
    }
    return Number(id) || 0;
  }

  // Mapper completo para gRPC que incluye driverLicenses
  static mapLicenseTypeForGrpc(item: any) {
    if (!item) {
      return null;
    }

    return {
      licenseTypeId: item.license_type_id,
      code: item.code,
      description: item.description || '',
      isProfessional: Boolean(item.is_professional),
      createdAt: item.created_at
        ? new Date(item.created_at).toISOString()
        : new Date().toISOString(),
      parentIncludes: (item.parentIncludes || []).map(include => ({
        parentLicenseTypeId: this.convertGrpcId(include.parent_license_type_id),
        childLicenseTypeId: this.convertGrpcId(include.child_license_type_id)
      })),
      childIncludes: (item.childIncludes || []).map(include => ({
        parentLicenseTypeId: this.convertGrpcId(include.parent_license_type_id),
        childLicenseTypeId: this.convertGrpcId(include.child_license_type_id)
      })),
      driverLicenses: (item.driverLicenses || []).map(license => ({
        driverLicenseId: this.convertGrpcId(license.driver_license_id),
        driverId: this.convertGrpcId(license.driver_id),
        licenseTypeId: this.convertGrpcId(license.license_type_id),
        number: license.number || '',
        issuedAt: license.issued_at || '',
        expiresAt: license.expires_at || '',
        status: license.status || 'VALID',
        version: this.convertGrpcId(license.version)
      }))
    };
  }

  // Mapper para el método FindAll
  static mapFindAllResponse(items: any[]) {
    const processedItems = items.map((item) => ({
      licenseTypeId: item.license_type_id,
      code: item.code,
      description: item.description || '',
      isProfessional: Boolean(item.is_professional),
      createdAt: item.created_at
        ? new Date(item.created_at).toISOString()
        : new Date().toISOString(),
      parentIncludes: (item.parentIncludes || []).map(include => ({
        parentLicenseTypeId: include.parent_license_type_id,
        childLicenseTypeId: include.child_license_type_id
      })),
      childIncludes: (item.childIncludes || []).map(include => ({
        parentLicenseTypeId: include.parent_license_type_id,
        childLicenseTypeId: include.child_license_type_id
      }))
    }));

    return { items: processedItems };
  }

  // Mapper para el método GetClosure
  static mapGetClosureResponse(child_ids: any[]) {
    return { 
      childIds: child_ids.map(id => Number(id) || 0)
    };
  }

  // Mapper para el método AddInclusion
  static mapAddInclusionResponse(result: any) {
    return {
      parentLicenseTypeId: Number(result.parent_license_type_id) || 0,
      childLicenseTypeId: Number(result.child_license_type_id) || 0
    };
  }

  // Mapper para el método RemoveInclusion
  static mapRemoveInclusionResponse() {
    return { success: true };
  }

  // Mapper para el método Remove
  static mapRemoveResponse() {
    return { success: true };
  }

  // Función para extraer el ID del driver de la solicitud
  static extractLicenseTypeId(data: any): number {
    let licenseTypeId: any;
    if (data.id !== undefined) {
      licenseTypeId = data.id;
    } else if (data.license_type_id !== undefined) {
      licenseTypeId = data.license_type_id;
    } else {
      throw new RpcException('license_type_id is required');
    }
    return this.convertGrpcId(licenseTypeId);
  }

  // Función para extraer parentId y childId de la solicitud
  static extractParentAndChildIds(data: any): { parentId: number; childId: number } {
    let parentId: any;
    let childId: any;

    if (data.parentId !== undefined && data.childId !== undefined) {
      parentId = data.parentId;
      childId = data.childId;
    } else if (data.parent_id !== undefined && data.child_id !== undefined) {
      parentId = data.parent_id;
      childId = data.child_id;
    } else {
      throw new RpcException('parent_id and child_id are required');
    }

    return {
      parentId: this.convertGrpcId(parentId),
      childId: this.convertGrpcId(childId)
    };
  }

  // Función para extraer licenseTypeId para GetClosure
  static extractLicenseTypeIdForClosure(data: any): number {
    let licenseTypeId: any = data.license_type_id || data.licenseTypeId;
    
    if (!licenseTypeId) {
      throw new RpcException('license_type_id is required');
    }

    return this.convertGrpcId(licenseTypeId);
  }
}

// Helpers externos (se mantienen igual)
const read = (obj: any, snake: string, camel: string) => {
  if (!obj) return undefined;
  if (obj[snake] !== undefined) return obj[snake];
  if (obj[camel] !== undefined) return obj[camel];
  return undefined;
};

const safeNumber = (v: any) => {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const safeDateISO = (d: any) => {
  if (!d) return '';
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString();
  } catch {
    return '';
  }
};

const mapInclude = (inc: any) => ({
  parent_license_type_id: safeNumber(
    read(inc, 'parent_license_type_id', 'parentLicenseTypeId'),
  ),
  child_license_type_id: safeNumber(
    read(inc, 'child_license_type_id', 'childLicenseTypeId'),
  ),
});

// Flat LicenseType (for Create/FindOne/FindByCode/Update)
export function mapLicenseTypeFlat(t: any) {
  if (!t) return null;
  return {
    license_type_id: safeNumber(read(t, 'license_type_id', 'licenseTypeId')),
    code: String(read(t, 'code', 'code') ?? '') || '',
    description: String(read(t, 'description', 'description') ?? '') || '',
    is_professional: Boolean(read(t, 'is_professional', 'isProfessional')),
    created_at: safeDateISO(read(t, 'created_at', 'createdAt')),
    parent_includes: Array.isArray(read(t, 'parent_includes', 'parentIncludes'))
      ? read(t, 'parent_includes', 'parentIncludes').map(mapInclude)
      : [],
    child_includes: Array.isArray(read(t, 'child_includes', 'childIncludes'))
      ? read(t, 'child_includes', 'childIncludes').map(mapInclude)
      : [],
    driver_licenses: Array.isArray(read(t, 'driver_licenses', 'driverLicenses'))
      ? read(t, 'driver_licenses', 'driverLicenses')
      : [],
  };
}

// LicenseTypeWithIncludes (for FindAll list items)
export function transformForGrpc(item: any) {
  return {
    license_type_id: Number(item.license_type_id) || 0,
    code: String(item.code || ''),
    description: String(item.description || ''),
    is_professional: Boolean(item.is_professional),
    created_at: item.created_at
      ? new Date(item.created_at).toISOString()
      : new Date().toISOString(),
    parent_includes: (item.parentIncludes || []).map((include: any) => ({
      parent_license_type_id: Number(include.parent_license_type_id) || 0,
      child_license_type_id: Number(include.child_license_type_id) || 0,
    })),
    child_includes: (item.childIncludes || []).map((include: any) => ({
      parent_license_type_id: Number(include.parent_license_type_id) || 0,
      child_license_type_id: Number(include.child_license_type_id) || 0,
    })),
  };
}