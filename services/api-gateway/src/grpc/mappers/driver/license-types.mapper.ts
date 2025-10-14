/**
 * Convierte objetos Long de gRPC a number
 */
function convertGrpcLong(id: any): number {
  if (typeof id === 'object' && id !== null && 'low' in id) {
    return Number(id.low) || 0;
  }
  return Number(id) || 0;
}

/**
 * Mapper para transformar HTTP body a LicenseTypesService requests (gRPC)
 * Basado en license-types.grpc.controller.ts y license-types-grpc.mapper.ts del microservicio driver-ms
 */
export class LicenseTypesHttpMapper {
  /**
   * Convierte HTTP body (camelCase) a gRPC CreateLicenseTypeRequest (snake_case)
   */
  static toCreateLicenseType(src: any) {
    console.log('🔵 API Gateway - toCreateLicenseType INPUT:', JSON.stringify(src, null, 2));
    console.log('🔵 API Gateway - src.isProfessional:', src.isProfessional, 'type:', typeof src.isProfessional);
    
    // Use nullish coalescing (??) instead of logical OR (||) to preserve false values
    const isProfessional = src.isProfessional ?? src.is_professional ?? false;
    console.log('🔵 API Gateway - isProfessional after conversion:', isProfessional, 'type:', typeof isProfessional);
    
    const result = {
      code: src.code,
      description: src.description || '',
      // Enviar ambas variantes porque proto-loader transforma snake_case a camelCase
      is_professional: isProfessional,
      isProfessional,
    };
    
    console.log('🔵 API Gateway - toCreateLicenseType OUTPUT:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Convierte HTTP body (camelCase) a gRPC UpdateLicenseTypeRequest (snake_case)
   */
  static toUpdateLicenseType(id: string | number, src: any) {
    console.log('🔵 API Gateway - toUpdateLicenseType INPUT:', JSON.stringify(src, null, 2));
    console.log('🔵 API Gateway - src.isProfessional:', src.isProfessional, 'type:', typeof src.isProfessional);
    
    // Use nullish coalescing (??) instead of logical OR (||) to preserve false values
    const isProfessional = src.isProfessional ?? src.is_professional;
    console.log('🔵 API Gateway - isProfessional after conversion:', isProfessional, 'type:', typeof isProfessional);
    
    const result = {
      id: Number(id),
      code: src.code,
      description: src.description,
      is_professional: isProfessional,
      isProfessional,
    };
    
    console.log('🔵 API Gateway - toUpdateLicenseType OUTPUT:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Convierte HTTP body (camelCase) a gRPC AddInclusionRequest (snake_case)
   */
  static toAddInclusionRequest(src: any) {
    return {
      parent_id: Number(src.parentId || src.parent_id),
      child_id: Number(src.childId || src.child_id),
    };
  }

  /**
   * Convierte HTTP body (camelCase) a gRPC RemoveInclusionRequest (snake_case)
   */
  static toRemoveInclusionRequest(src: any) {
    return {
      parent_id: Number(src.parentId || src.parent_id),
      child_id: Number(src.childId || src.child_id),
    };
  }

  /**
   * Convierte LicenseInclude de gRPC (camelCase) a HTTP response (camelCase)
   * Según LicenseTypesGrpcMapper.mapLicenseTypeForGrpc
   */
  static toLicenseIncludeResponse(include: any) {
    if (!include) return undefined;

    return {
      parentLicenseTypeId: include.parentLicenseTypeId || include.parent_license_type_id,
      childLicenseTypeId: include.childLicenseTypeId || include.child_license_type_id,
    };
  }

  /**
   * Convierte DriverLicense de gRPC (camelCase) a HTTP response (camelCase)
   * Según LicenseTypesGrpcMapper.mapLicenseTypeForGrpc
   */
  static toDriverLicenseResponse(license: any) {
    if (!license) return undefined;

    return {
      driverLicenseId: license.driverLicenseId,
      driverId: license.driverId,
      licenseTypeId: license.licenseTypeId,
      number: license.number,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      status: license.status,
      version: license.version,
    };
  }

  /**
   * Convierte LicenseType de gRPC (camelCase) a HTTP response (camelCase)
   * Según LicenseTypesGrpcMapper.mapLicenseTypeForGrpc
   */
  static toLicenseTypeResponse(licenseType: any) {
    if (!licenseType) return null;

    return {
      licenseTypeId: licenseType.licenseTypeId,
      code: licenseType.code,
      description: licenseType.description || '',
      isProfessional: licenseType.isProfessional || false,
      createdAt: licenseType.createdAt,
      parentIncludes: licenseType.parentIncludes 
        ? licenseType.parentIncludes.map((i: any) => this.toLicenseIncludeResponse(i)) 
        : undefined,
      childIncludes: licenseType.childIncludes 
        ? licenseType.childIncludes.map((i: any) => this.toLicenseIncludeResponse(i)) 
        : undefined,
      driverLicenses: licenseType.driverLicenses 
        ? licenseType.driverLicenses.map((l: any) => this.toDriverLicenseResponse(l)) 
        : undefined,
    };
  }

  /**
   * Convierte LicenseTypeList de gRPC a HTTP response (camelCase)
   * Según LicenseTypesGrpcMapper.mapFindAllResponse
   */
  static toLicenseTypeListResponse(response: any) {
    if (!response) return { items: [] };

    return {
      items: response.items ? response.items.map((lt: any) => this.toLicenseTypeResponse(lt)) : [],
    };
  }

  /**
   * Convierte GetClosureResponse de gRPC a HTTP response (camelCase)
   * gRPC ya convierte snake_case del proto a camelCase automáticamente
   */
  static toGetClosureResponse(response: any) {
    if (!response) return { childIds: [] };

    return {
      childIds: response.childIds || [],
    };
  }

  /**
   * Convierte AddInclusionResponse de gRPC a HTTP response (camelCase)
   * gRPC ya convierte snake_case del proto a camelCase automáticamente
   */
  static toAddInclusionResponse(response: any) {
    if (!response) return null;

    return {
      parentLicenseTypeId: response.parentLicenseTypeId,
      childLicenseTypeId: response.childLicenseTypeId,
    };
  }

  /**
   * Convierte RemoveLicenseTypeResponse de gRPC a HTTP response
   * Según LicenseTypesGrpcMapper.mapRemoveResponse
   */
  static toRemoveLicenseTypeResponse(response: any) {
    return {
      success: response?.success || false,
    };
  }

  /**
   * Convierte RemoveInclusionResponse de gRPC a HTTP response
   * Según LicenseTypesGrpcMapper.mapRemoveInclusionResponse
   */
  static toRemoveInclusionResponse(response: any) {
    return {
      success: response?.success || false,
    };
  }
}
