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
   * Convierte HTTP body (camelCase) a gRPC CreateLicenseTypeRequest
   * Según LicenseTypesGrpcController.create
   */
  static toCreateLicenseType(src: any) {
    return {
      code: src.code,
      description: src.description || '',
      is_professional: src.isProfessional !== undefined ? Boolean(src.isProfessional || src.is_professional) : undefined,
    };
  }

  /**
   * Convierte HTTP body (camelCase) a gRPC UpdateLicenseTypeRequest
   * Según LicenseTypesGrpcController.update
   */
  static toUpdateLicenseType(id: string | number, src: any) {
    return {
      id: Number(id),
      code: src.code,
      description: src.description,
      is_professional: src.isProfessional !== undefined ? Boolean(src.isProfessional || src.is_professional) : undefined,
    };
  }

  /**
   * Convierte HTTP body a gRPC AddInclusionRequest
   * Según LicenseTypesGrpcController.addInclusion
   * Cliente espera: { parent_id: number; child_id: number }
   */
  static toAddInclusionRequest(src: any) {
    return {
      parent_id: Number(src.parentId || src.parent_id),
      child_id: Number(src.childId || src.child_id),
    };
  }

  /**
   * Convierte HTTP body a gRPC RemoveInclusionRequest
   * Según LicenseTypesGrpcController.removeInclusion
   * Cliente espera: { parent_id: number; child_id: number }
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
   * Convierte GetClosureResponse de gRPC (snake_case) a HTTP response (camelCase)
   * Según LicenseTypesGrpcMapper.mapGetClosureResponse
   */
  static toGetClosureResponse(response: any) {
    if (!response) return { childIds: [] };

    return {
      childIds: response.child_ids || [],
    };
  }

  /**
   * Convierte AddInclusionResponse de gRPC (snake_case) a HTTP response (camelCase)
   * Según LicenseTypesGrpcMapper.mapAddInclusionResponse
   */
  static toAddInclusionResponse(response: any) {
    if (!response) return null;

    return {
      parentLicenseTypeId: response.parent_license_type_id,
      childLicenseTypeId: response.child_license_type_id,
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
