/**
 * Convierte valores de gRPC a number
 * Con longs: Number en ambos lados, debería recibir números directamente
 */
function convertGrpcLong(id: any): number {
  if (id === null || id === undefined) {
    return 0;
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
 * Helper para convertir enum de gRPC a string
 * gRPC ya convierte automáticamente el enum numérico a string (ON_ROUTE, AVAILABLE, etc.)
 */
function fromAvailabilityEnum(val: any): string {
  // gRPC ya devuelve el string directamente, solo necesitamos validarlo
  if (typeof val === 'string' && val) {
    return val;
  }
  
  // Si viene como número (fallback), convertirlo
  const num = Number(val);
  if (!isNaN(num)) {
    switch (num) {
      case 1: return 'AVAILABLE';
      case 2: return 'ON_ROUTE';
      case 3: return 'LICENSE_EXPIRED';
      case 4: return 'INACTIVE';
    }
  }
  
  // Default
  return 'AVAILABLE';
}

/**
 * Helper para convertir enum de gRPC a string
 * gRPC ya convierte automáticamente el enum numérico a string (VALID, EXPIRED, SUSPENDED)
 */
function fromLicenseStatusEnum(val: any): string {
  // gRPC ya devuelve el string directamente, solo necesitamos validarlo
  if (typeof val === 'string' && val) {
    return val;
  }
  
  // Si viene como número (fallback), convertirlo
  const num = Number(val);
  if (!isNaN(num)) {
    switch (num) {
      case 1: return 'VALID';
      case 2: return 'EXPIRED';
      case 3: return 'SUSPENDED';
    }
  }
  
  // Default
  return 'VALID';
}

/**
 * Mapper para transformar HTTP body a DriversService requests (gRPC)
 * Basado en drivers.grpc.controller.ts y drivers-grpc.mapper.ts del microservicio driver-ms
 */
export class DriversHttpMapper {
  /**
   * Convierte HTTP body (camelCase) a gRPC CreateDriverRequest (snake_case)
   */
  static toCreateDriver(src: any) {
    // Preferir userId (camelCase) sobre user_id (snake_case)
    const userId = src.userId !== undefined ? src.userId : src.user_id;
    const convertedUserId = convertGrpcLong(userId);
    
    if (convertedUserId <= 0) {
      throw new Error(`userId inválido: ${userId} convertido a ${convertedUserId}`);
    }
    
    // Enviar ambas variantes porque proto-loader transforma snake_case a camelCase
    return {
      user_id: convertedUserId,  // snake_case (proto original)
      userId: convertedUserId,   // camelCase (transformado por proto-loader)
      availability: src.availability || 'AVAILABLE',
      version: src.version !== undefined ? convertGrpcLong(src.version) : undefined,
    };
  }

  /**
   * Convierte HTTP body (camelCase) a gRPC UpdateDriverRequest (snake_case)
   */
  static toUpdateDriver(id: string | number, src: any) {
    const payload: any = {
      id: convertGrpcLong(id),
    };

    // Campos del conductor (todos opcionales)
    if (src.userId !== undefined || src.user_id !== undefined) {
      payload.user_id = convertGrpcLong(src.userId || src.user_id);
    }
    if (src.availability !== undefined) {
      payload.availability = src.availability;
    }
    if (src.version !== undefined) {
      payload.version = convertGrpcLong(src.version);
    }

    return payload;
  }

  /**
   * Convierte HTTP query params a gRPC CanDriveRequest (snake_case)
   */
  static toCanDriveRequest(driverId: string | number, licenseTypeId: string | number) {
    return {
      driver_id: convertGrpcLong(driverId),
      license_type_id: convertGrpcLong(licenseTypeId),
    };
  }

  /**
   * Convierte DriverLicense de gRPC a HTTP response (camelCase)
   * gRPC ya convierte snake_case del proto a camelCase automáticamente
   */
  static toDriverLicenseResponse(license: any) {
    if (!license) return undefined;

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
      daysUntilExpiry: license.daysUntilExpiry !== undefined ? convertGrpcLong(license.daysUntilExpiry) : undefined,
    };
  }

  /**
   * Convierte DriverSummary de gRPC a HTTP response (camelCase)
   * gRPC ya convierte snake_case del proto a camelCase automáticamente
   */
  static toDriverSummaryResponse(summary: any) {
    if (!summary) return undefined;

    return {
      totalLicenses: convertGrpcLong(summary.totalLicenses),
      activeLicenses: convertGrpcLong(summary.activeLicenses),
      expiredLicenses: convertGrpcLong(summary.expiredLicenses),
      suspendedLicenses: convertGrpcLong(summary.suspendedLicenses),
      licenseTypes: Array.isArray(summary.licenseTypes) ? summary.licenseTypes : [],
    };
  }

  /**
   * Convierte Driver de gRPC a HTTP response (camelCase)
   * gRPC ya convierte snake_case del proto a camelCase automáticamente
   */
  static toDriverResponse(driver: any) {
    if (!driver) return null;

    return {
      driverId: convertGrpcLong(driver.driverId),
      userId: convertGrpcLong(driver.userId),
      availability: fromAvailabilityEnum(driver.availability),
      version: convertGrpcLong(driver.version),
      createdAt: driver.createdAt || '',
      updatedAt: driver.updatedAt || '',
      licenses: Array.isArray(driver.licenses) ? driver.licenses.map((l: any) => this.toDriverLicenseResponse(l)) : [],
      summary: driver.summary ? this.toDriverSummaryResponse(driver.summary) : undefined,
    };
  }

  /**
   * Convierte DriversList de gRPC a HTTP response (camelCase)
   * Según DriversGrpcController.findAll
   */
  static toDriversListResponse(response: any) {
    if (!response) return { drivers: [], total: 0 };

    return {
      drivers: Array.isArray(response.drivers) ? response.drivers.map((d: any) => this.toDriverResponse(d)) : [],
      total: convertGrpcLong(response.total),
    };
  }

  /**
   * Convierte MatchingLicense de gRPC a HTTP response (camelCase)
   * gRPC ya convierte snake_case del proto a camelCase automáticamente
   */
  static toMatchingLicenseResponse(license: any) {
    if (!license) return undefined;

    return {
      licenseId: convertGrpcLong(license.licenseId),
      licenseType: license.licenseType,
      expiresAt: license.expiresAt,
    };
  }

  /**
   * Convierte CanDriveResponse de gRPC a HTTP response (camelCase)
   * gRPC ya convierte snake_case del proto a camelCase automáticamente
   */
  static toCanDriveResponse(response: any) {
    if (!response) return null;

    return {
      canDrive: response.canDrive,
      reason: response.reason || '',
      matchingLicenses: response.matchingLicenses 
        ? response.matchingLicenses.map((l: any) => this.toMatchingLicenseResponse(l)) 
        : [],
    };
  }

  /**
   * Convierte RemoveDriverResponse de gRPC a HTTP response (camelCase)
   * Según DriversGrpcController.remove
   */
  static toRemoveDriverResponse(response: any) {
    return {
      success: response?.success || false,
    };
  }
}
