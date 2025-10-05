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
function fromAvailabilityEnum(val: any): string {
  const num = Number(val);
  switch (num) {
    case 1: return 'AVAILABLE';
    case 2: return 'ON_ROUTE';
    case 3: return 'LICENSE_EXPIRED';
    case 4: return 'INACTIVE';
    default: return 'AVAILABLE';
  }
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
 * Mapper para transformar HTTP body a DriversService requests (gRPC)
 * Basado en drivers.grpc.controller.ts y drivers-grpc.mapper.ts del microservicio driver-ms
 */
export class DriversHttpMapper {
  /**
   * Convierte HTTP body (camelCase) a gRPC CreateDriverRequest
   * Según DriversGrpcMapper.mapCreateDataToDto
   * Cliente espera: { user_id: number; availability?: DriverAvailability; version?: number }
   */
  static toCreateDriver(src: any) {
    return {
      user_id: convertGrpcLong(src.userId || src.user_id),
      availability: src.availability || 'AVAILABLE',
      version: src.version !== undefined ? convertGrpcLong(src.version) : undefined,
    };
  }

  /**
   * Convierte HTTP body (camelCase) a gRPC UpdateDriverRequest
   * Según DriversGrpcMapper.mapUpdateDataToDto
   * Cliente espera: { id: number; user_id?: number; availability?: DriverAvailability; version?: number }
   */
  static toUpdateDriver(id: string | number, src: any) {
    return {
      id: convertGrpcLong(id),
      user_id: src.userId !== undefined ? convertGrpcLong(src.userId || src.user_id) : undefined,
      availability: src.availability,
      version: src.version !== undefined ? convertGrpcLong(src.version) : undefined,
    };
  }

  /**
   * Convierte HTTP query params a gRPC CanDriveRequest
   * Según DriversGrpcMapper.mapCanDriveData (usa snake_case)
   * Cliente espera: { driver_id: number; license_type_id: number }
   */
  static toCanDriveRequest(driverId: string | number, licenseTypeId: string | number) {
    return {
      driver_id: convertGrpcLong(driverId),
      license_type_id: convertGrpcLong(licenseTypeId),
    };
  }

  /**
   * Convierte DriverLicense de gRPC (snake_case) a HTTP response (camelCase)
   * Según DriversGrpcMapper.mapDriverToProto
   */
  static toDriverLicenseResponse(license: any) {
    if (!license) return undefined;

    return {
      driverLicenseId: convertGrpcLong(license.driver_license_id),
      driverId: convertGrpcLong(license.driver_id),
      licenseTypeId: convertGrpcLong(license.license_type_id),
      number: license.number,
      issuedAt: license.issued_at,
      expiresAt: license.expires_at,
      status: fromLicenseStatusEnum(license.status),
      version: convertGrpcLong(license.version),
      licenseTypeCode: license.license_type_code || undefined,
      licenseTypeDescription: license.license_type_description || undefined,
      isActive: license.is_active !== undefined ? license.is_active : undefined,
      daysUntilExpiry: license.days_until_expiry !== undefined ? convertGrpcLong(license.days_until_expiry) : undefined,
    };
  }

  /**
   * Convierte DriverSummary de gRPC (snake_case) a HTTP response (camelCase)
   * Según DriversGrpcMapper.mapDriverToProto
   */
  static toDriverSummaryResponse(summary: any) {
    if (!summary) return undefined;

    return {
      totalLicenses: convertGrpcLong(summary.total_licenses),
      activeLicenses: convertGrpcLong(summary.active_licenses),
      expiredLicenses: convertGrpcLong(summary.expired_licenses),
      suspendedLicenses: convertGrpcLong(summary.suspended_licenses),
      licenseTypes: summary.license_types || [],
    };
  }

  /**
   * Convierte Driver de gRPC a HTTP response (camelCase)
   * Según DriversGrpcMapper.mapDriverToResponse (Create/Update) y mapDriverToProto (FindOne/FindAll)
   */
  static toDriverResponse(driver: any) {
    if (!driver) return null;

    // Para responses de Create/Update que usan mapDriverToResponse (formato camelCase)
    if (driver.driverId !== undefined) {
      return {
        driverId: convertGrpcLong(driver.driverId),
        userId: convertGrpcLong(driver.userId),
        availability: fromAvailabilityEnum(driver.availability),
        version: convertGrpcLong(driver.version),
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
        licenses: driver.licenses || [],
      };
    }

    // Para responses de FindOne/FindAll que usan mapDriverToProto (formato snake_case)
    return {
      driverId: convertGrpcLong(driver.driver_id),
      userId: convertGrpcLong(driver.user_id),
      availability: fromAvailabilityEnum(driver.availability),
      version: convertGrpcLong(driver.version),
      createdAt: driver.created_at,
      updatedAt: driver.updated_at,
      licenses: driver.licenses ? driver.licenses.map((l: any) => this.toDriverLicenseResponse(l)) : undefined,
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
      drivers: response.drivers ? response.drivers.map((d: any) => this.toDriverResponse(d)) : [],
      total: convertGrpcLong(response.total),
    };
  }

  /**
   * Convierte MatchingLicense de gRPC (snake_case) a HTTP response (camelCase)
   * Según DriversGrpcMapper.mapCanDriveResponse
   */
  static toMatchingLicenseResponse(license: any) {
    if (!license) return undefined;

    return {
      licenseId: convertGrpcLong(license.license_id),
      licenseType: license.license_type,
      expiresAt: license.expires_at,
    };
  }

  /**
   * Convierte CanDriveResponse de gRPC (snake_case) a HTTP response (camelCase)
   * Según DriversGrpcMapper.mapCanDriveResponse
   */
  static toCanDriveResponse(response: any) {
    if (!response) return null;

    return {
      canDrive: response.can_drive,
      reason: response.reason || '',
      matchingLicenses: response.matching_licenses 
        ? response.matching_licenses.map((l: any) => this.toMatchingLicenseResponse(l)) 
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
