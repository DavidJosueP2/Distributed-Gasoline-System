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
 * Crea un objeto Long para gRPC
 */
function createLongObject(value: any): any {
  const numValue = Number(value) || 0;
  return {
    low: numValue,
    high: 0,
    unsigned: false,
  };
}

/**
 * Helper para convertir enum numérico de gRPC a string
 */
function fromLicenseStatusEnum(val: any): string {
  const num = Number(val);
  switch (num) {
    case 1: return 'VALID';
    case 2: return 'EXPIRED';
    case 3: return 'SUSPENDED';
    default: return 'VALID';
  }
}

/**
 * Mapper para transformar HTTP body a DriverLicensesService requests (gRPC)
 * Basado en driver-licenses.grpc.controller.ts y driver-licenses-grpc.mapper.ts del microservicio driver-ms
 */
export class DriverLicensesHttpMapper {
  /**
   * Convierte HTTP body (camelCase) a gRPC CreateDriverLicenseRequest (snake_case)
   * Según DriverLicensesGrpcMapper.mapCreateDataToDto
   */
  static toCreateDriverLicense(src: any) {
    return {
      driver_id: convertGrpcLong(src.driverId || src.driver_id),
      license_type_id: convertGrpcLong(src.licenseTypeId || src.license_type_id),
      number: src.number,
      issued_at: src.issuedAt || src.issued_at,
      expires_at: src.expiresAt || src.expires_at,
      status: src.status !== undefined ? Number(src.status) : undefined,
    };
  }

  /**
   * Convierte HTTP params a gRPC SuspendLicenseRequest (snake_case)
   * Según DriverLicensesGrpcMapper.mapSuspendData
   */
  static toSuspendLicenseRequest(driverId: string | number, licenseId: string | number) {
    return {
      driver_id: convertGrpcLong(driverId),
      license_id: convertGrpcLong(licenseId),
    };
  }

  /**
   * Convierte HTTP params a gRPC FindByDriverRequest (snake_case)
   * Según DriverLicensesGrpcMapper.mapFindByDriverData
   */
  static toFindByDriverRequest(driverId: string | number) {
    return {
      driver_id: convertGrpcLong(driverId),
    };
  }

  /**
   * Convierte DriverLicense de gRPC (camelCase) a HTTP response (camelCase)
   * Según DriverLicensesGrpcMapper.mapDriverLicenseToProto
   */
  static toDriverLicenseResponse(license: any) {
    if (!license) return null;

    return {
      driverLicenseId: convertGrpcLong(license.driverLicenseId),
      driverId: convertGrpcLong(license.driverId),
      licenseTypeId: convertGrpcLong(license.licenseTypeId),
      number: license.number,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      status: fromLicenseStatusEnum(license.status),
      version: convertGrpcLong(license.version),
      licenseTypeCode: license.licenseTypeCode || undefined,
      licenseTypeDescription: license.licenseTypeDescription || undefined,
      isActive: license.isActive !== undefined ? license.isActive : undefined,
    };
  }

  /**
   * Convierte DriverLicenseList de gRPC a HTTP response (camelCase)
   * Según DriverLicensesGrpcMapper.mapDriverLicenseListToProto
   */
  static toDriverLicenseListResponse(response: any) {
    if (!response) return { items: [] };

    return {
      items: response.items ? response.items.map((l: any) => this.toDriverLicenseResponse(l)) : [],
    };
  }
}
