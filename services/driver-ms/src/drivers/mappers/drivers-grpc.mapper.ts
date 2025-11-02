import { RpcException } from '@nestjs/microservices';

export class DriversGrpcMapper {
  // Método para convertir IDs de gRPC
  static convertGrpcId(id: any): number {
    if (typeof id === 'object' && id !== null && 'low' in id) {
      return Number(id.low) || 0;
    }
    return Number(id) || 0;
  }

  static createLongObject(value: any): any {
    // ⬅️ Con longs: Number en el servidor, devolver número directamente
    return Number(value) || 0;
  }

  static mapCreateDataToDto(data: any): { createDto: any } {
    // Accept both snake_case and camelCase for incoming IDs and treat 0 as valid
    const userField = data.user_id ?? data.userId;
    if (userField === undefined || userField === null) {
      throw new RpcException('Missing required field: user_id');
    }

    const createDto = {
      user_id: this.convertGrpcId(userField),
      availability: data.availability || 'AVAILABLE',
      version: data.version ? this.convertGrpcId(data.version) : 0,
    };

    return { createDto };
  }

  static mapUpdateDataToDto(data: any): { updateDto: any; driverId: number } {
    const driverId = data.id;
    if (driverId === undefined) {
      throw new RpcException('id is required');
    }

    const convertedId = this.convertGrpcId(driverId);

    // Accept both snake_case and camelCase for user id on update
    const userField = data.user_id ?? data.userId;
    const updateDto: any = {
      user_id:
        userField !== undefined && userField !== null
          ? this.convertGrpcId(userField)
          : undefined,
      availability: data.availability,
      version: data.version ? this.convertGrpcId(data.version) : undefined,
    };

    // Limpiar campos undefined
    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] === undefined) {
        delete updateDto[key];
      }
    });

    return { updateDto, driverId: convertedId };
  }

  static mapDriverToResponse(drv: any) {
    return {
      driverId: this.createLongObject(drv.driver_id || drv.driver_id || 0),
      userId: this.createLongObject(drv.user_id),
      availability: this.mapAvailabilityToProto(drv.availability || 'AVAILABLE'),
      version: this.createLongObject(drv.version || 1),
      createdAt: drv.created_at
        ? new Date(drv.created_at).toISOString()
        : new Date().toISOString(),
      updatedAt: drv.updated_at
        ? new Date(drv.updated_at).toISOString()
        : new Date().toISOString(),
      licenses: [],
    };
  }

  static mapDriverToProto(d: any) {
    if (!d) return null;

    const licenses = Array.isArray(d.licenses) ? d.licenses : [];
    const summary = this.calculateDriverSummary(d);

    return {
      driverId: this.createLongObject(d.driver_id),
      userId: this.createLongObject(d.user_id),
      availability: this.mapAvailabilityToProto(d.availability),
      version: this.createLongObject(d.version),
      createdAt: d.created_at ? new Date(d.created_at).toISOString() : '',
      updatedAt: d.updated_at ? new Date(d.updated_at).toISOString() : '',
      licenses: licenses.map((l: any) => ({
        driverLicenseId: this.createLongObject(l.driver_license_id),
        driverId: this.createLongObject(l.driver_id),
        licenseTypeId: this.createLongObject(l.license_type_id),
        number: l.number || '',
        issuedAt: l.issued_at ? this.toDateString(l.issued_at) : '',
        expiresAt: l.expires_at ? this.toDateString(l.expires_at) : '',
        status: this.mapLicenseStatusToProto(l.status),
        version: this.createLongObject(l.version),
        licenseTypeCode: l.license_type?.code || l.license_type_code || '',
        licenseTypeDescription:
          l.license_type?.description || l.license_type_description || '',
        isActive: l.status === 'VALID',
        daysUntilExpiry: this.createLongObject(
          this.calculateDaysUntilExpiry(l.expires_at),
        ),
      })),
      summary: {
        totalLicenses: this.createLongObject(summary.total_licenses),
        activeLicenses: this.createLongObject(summary.active_licenses),
        expiredLicenses: this.createLongObject(summary.expired_licenses),
        suspendedLicenses: this.createLongObject(summary.suspended_licenses),
        licenseTypes: summary.license_types || [],
      },
    };
  }

  static mapCanDriveData(data: any): { driverId: number; licenseTypeId: number } {
    const driverId = data.driver_id ?? data.driverId;
    const licenseTypeId = data.license_type_id ?? data.licenseTypeId;

    if (driverId === undefined || driverId === null || licenseTypeId === undefined || licenseTypeId === null) {
      throw new RpcException('driver_id and license_type_id are required');
    }

    return {
      driverId: this.convertGrpcId(driverId),
      licenseTypeId: this.convertGrpcId(licenseTypeId),
    };
  }

  static mapCanDriveResponse(result: any) {
    return {
      canDrive: result.can_drive,
      reason: result.reason || '',
      matchingLicenses: (result.matching_licenses || []).map((license: any) => ({
        licenseId: this.createLongObject(license.license_id),
        licenseType: license.license_type || '',
        expiresAt: license.expires_at || '',
      })),
    };
  }

  static extractDriverId(data: any): number {
    let driverId: any;
    if (data.id !== undefined) {
      driverId = data.id;
    } else if (data.driver_id !== undefined) {
      driverId = data.driver_id;
    } else {
      throw new RpcException('driver_id is required');
    }
    return this.convertGrpcId(driverId);
  }

  private static calculateDaysUntilExpiry(expiresAt: string): number {
    if (!expiresAt) return 0;
    try {
      const expiryDate = new Date(expiresAt);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  private static calculateDriverSummary(driver: any): any {
    const licenses = Array.isArray(driver.licenses) ? driver.licenses : [];

    const total_licenses = licenses.length;
    const active_licenses = licenses.filter(
      (l: any) => l.status === 'VALID',
    ).length;
    const expired_licenses = licenses.filter(
      (l: any) => l.status === 'EXPIRED',
    ).length;
    const suspended_licenses = licenses.filter(
      (l: any) => l.status === 'SUSPENDED',
    ).length;

    const license_types = [
      ...new Set(
        licenses
          .map((l: any) => l.license_type?.code || l.license_type_code || '')
          .filter((code: string) => code !== ''),
      ),
    ];

    return {
      total_licenses,
      active_licenses,
      expired_licenses,
      suspended_licenses,
      license_types,
    };
  }

  private static toDateString(d: Date | string): string {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toISOString().slice(0, 10);
  }

  private static mapLicenseStatusToProto(status: string | undefined): number {
    if (!status) return 0;
    switch (status.toUpperCase()) {
      case 'VALID':
        return 1;
      case 'EXPIRED':
        return 2;
      case 'SUSPENDED':
        return 3;
      default:
        return 0;
    }
  }

  private static mapAvailabilityToProto(availability: string | undefined): number {
    if (!availability) return 0;
    switch (availability.toUpperCase()) {
      case 'AVAILABLE':
        return 1;
      case 'ON_ROUTE':
        return 2;
      case 'LICENSE_EXPIRED':
        return 3;
      case 'INACTIVE':
        return 4;
      default:
        return 0;
    }
  }
}