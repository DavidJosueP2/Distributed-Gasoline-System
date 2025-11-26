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
 * Helper para convertir string a enum numérico de gRPC
 */
function toLicenseStatusEnum(val: string | number): number {
  if (typeof val === 'number') {
    return val;
  }
  const upper = String(val).toUpperCase();
  switch (upper) {
    case 'VALID': return 1;
    case 'EXPIRED': return 2;
    case 'SUSPENDED': return 3;
    default: return 1; // VALID por defecto
  }
}

/**
 * Mapper para transformar HTTP body a DriverLicensesService requests (gRPC)
 * Basado en driver-licenses.grpc.controller.ts y driver-licenses-grpc.mapper.ts del microservicio driver-ms
 */
export class DriverLicensesHttpMapper {
  /**
   * Convierte HTTP body (camelCase) a gRPC CreateDriverLicenseRequest (snake_case)
   * IMPORTANTE: Enviar ambas variantes (snake_case y camelCase) porque proto-loader
   * transforma automáticamente snake_case a camelCase y puede perder valores
   */
  static toCreateDriverLicense(src: any) {
    const driverId = src.driverId ?? src.driver_id;
    const licenseTypeId = src.licenseTypeId ?? src.license_type_id;
    
    if (!driverId || driverId <= 0) {
      throw new Error(`Invalid driverId: ${JSON.stringify(driverId)}`);
    }
    
    if (!licenseTypeId || licenseTypeId <= 0) {
      throw new Error(`Invalid licenseTypeId: ${JSON.stringify(licenseTypeId)}`);
    }
    
    const convertedDriverId = convertGrpcLong(driverId);
    const convertedLicenseTypeId = convertGrpcLong(licenseTypeId);
    
    // Enviar ambas variantes para compatibilidad con proto-loader
    return {
      driver_id: convertedDriverId,      // snake_case (proto original)
      driverId: convertedDriverId,       // camelCase (proto-loader)
      license_type_id: convertedLicenseTypeId,  // snake_case (proto original)
      licenseTypeId: convertedLicenseTypeId,    // camelCase (proto-loader)
      number: src.number,
      issued_at: src.issuedAt || src.issued_at,
      issuedAt: src.issuedAt || src.issued_at,
      expires_at: src.expiresAt || src.expires_at,
      expiresAt: src.expiresAt || src.expires_at,
      status: src.status !== undefined ? Number(src.status) : undefined,
    };
  }

  /**
   * Convierte HTTP params a gRPC SuspendLicenseRequest (snake_case)
   * IMPORTANTE: Enviar ambas variantes (snake_case y camelCase) porque proto-loader
   * transforma automáticamente snake_case a camelCase y puede perder valores
   */
  static toSuspendLicenseRequest(driverId: string | number, licenseId: string | number) {
    const convertedDriverId = convertGrpcLong(driverId);
    const convertedLicenseId = convertGrpcLong(licenseId);
    
    if (!convertedDriverId || convertedDriverId <= 0) {
      throw new Error(`Invalid driverId: ${JSON.stringify(driverId)}`);
    }
    
    if (!convertedLicenseId || convertedLicenseId <= 0) {
      throw new Error(`Invalid licenseId: ${JSON.stringify(licenseId)}`);
    }
    
    // Enviar ambas variantes para compatibilidad con proto-loader
    return {
      driver_id: convertedDriverId,      // snake_case (proto original)
      driverId: convertedDriverId,       // camelCase (proto-loader)
      license_id: convertedLicenseId,    // snake_case (proto original)
      licenseId: convertedLicenseId,     // camelCase (proto-loader)
    };
  }

  /**
   * Convierte HTTP params a gRPC ReactivateLicenseRequest (snake_case)
   * IMPORTANTE: Enviar ambas variantes (snake_case y camelCase) porque proto-loader
   * transforma automáticamente snake_case a camelCase y puede perder valores
   */
  static toReactivateLicenseRequest(driverId: string | number, licenseId: string | number) {
    const convertedDriverId = convertGrpcLong(driverId);
    const convertedLicenseId = convertGrpcLong(licenseId);
    
    if (!convertedDriverId || convertedDriverId <= 0) {
      throw new Error(`Invalid driverId: ${JSON.stringify(driverId)}`);
    }
    
    if (!convertedLicenseId || convertedLicenseId <= 0) {
      throw new Error(`Invalid licenseId: ${JSON.stringify(licenseId)}`);
    }
    
    // Enviar ambas variantes para compatibilidad con proto-loader
    return {
      driver_id: convertedDriverId,      // snake_case (proto original)
      driverId: convertedDriverId,       // camelCase (proto-loader)
      license_id: convertedLicenseId,    // snake_case (proto original)
      licenseId: convertedLicenseId,     // camelCase (proto-loader)
    };
  }

  /**
   * Convierte HTTP body a gRPC UpdateDriverLicenseRequest (snake_case)
   * IMPORTANTE: Enviar ambas variantes (snake_case y camelCase) porque proto-loader
   * transforma automáticamente snake_case a camelCase y puede perder valores
   */
  static toUpdateDriverLicenseRequest(
    driverId: string | number,
    licenseId: string | number,
    src: any
  ) {
    const convertedDriverId = convertGrpcLong(driverId);
    const convertedLicenseId = convertGrpcLong(licenseId);
    
    if (!convertedDriverId || convertedDriverId <= 0) {
      throw new Error(`Invalid driverId: ${JSON.stringify(driverId)}`);
    }
    
    if (!convertedLicenseId || convertedLicenseId <= 0) {
      throw new Error(`Invalid licenseId: ${JSON.stringify(licenseId)}`);
    }

    const result: any = {
      driver_id: convertedDriverId,
      driverId: convertedDriverId,
      license_id: convertedLicenseId,
      licenseId: convertedLicenseId,
    };

    // Agregar campos opcionales si están presentes
    if (src.licenseTypeId !== undefined || src.license_type_id !== undefined) {
      const licenseTypeId = convertGrpcLong(src.licenseTypeId ?? src.license_type_id);
      if (licenseTypeId > 0) {
        result.license_type_id = licenseTypeId;
        result.licenseTypeId = licenseTypeId;
      }
    }

    if (src.number !== undefined && src.number !== null && src.number !== '') {
      result.number = src.number;
    }

    if (src.issuedAt !== undefined || src.issued_at !== undefined) {
      const issuedAt = src.issuedAt ?? src.issued_at;
      if (issuedAt) {
        result.issued_at = issuedAt;
        result.issuedAt = issuedAt;
      }
    }

    if (src.expiresAt !== undefined || src.expires_at !== undefined) {
      const expiresAt = src.expiresAt ?? src.expires_at;
      if (expiresAt) {
        result.expires_at = expiresAt;
        result.expiresAt = expiresAt;
      }
    }

    if (src.status !== undefined && src.status !== null && src.status !== '') {
      const statusValue = typeof src.status === 'number' ? src.status : toLicenseStatusEnum(src.status);
      result.status = statusValue;
    }

    return result;
  }

  /**
   * Convierte HTTP params a gRPC FindByDriverRequest (snake_case)
   * IMPORTANTE: Enviar ambas variantes (snake_case y camelCase) porque proto-loader
   * transforma automáticamente snake_case a camelCase y puede perder valores
   */
  static toFindByDriverRequest(driverId: string | number) {
    const convertedDriverId = convertGrpcLong(driverId);
    
    if (!convertedDriverId || convertedDriverId <= 0) {
      throw new Error(`Invalid driverId: ${JSON.stringify(driverId)}`);
    }
    
    // Enviar ambas variantes para compatibilidad con proto-loader
    return {
      driver_id: convertedDriverId,      // snake_case (proto original)
      driverId: convertedDriverId,       // camelCase (proto-loader)
    };
  }

  /**
   * Convierte DriverLicense de gRPC (snake_case) a HTTP response (camelCase)
   * Según DriverLicensesGrpcMapper.mapDriverLicenseToProto
   */
  static toDriverLicenseResponse(license: any) {
    if (!license) return null;

    return {
      driverLicenseId: convertGrpcLong(license.driver_license_id || license.driverLicenseId),
      driverId: convertGrpcLong(license.driver_id || license.driverId),
      licenseTypeId: convertGrpcLong(license.license_type_id || license.licenseTypeId),
      number: license.number,
      issuedAt: license.issued_at || license.issuedAt,
      expiresAt: license.expires_at || license.expiresAt,
      status: fromLicenseStatusEnum(license.status),
      version: convertGrpcLong(license.version),
      licenseTypeCode: license.license_type_code || license.licenseTypeCode || undefined,
      licenseTypeDescription: license.license_type_description || license.licenseTypeDescription || undefined,
      isActive: license.is_active !== undefined ? license.is_active : (license.isActive !== undefined ? license.isActive : undefined),
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
