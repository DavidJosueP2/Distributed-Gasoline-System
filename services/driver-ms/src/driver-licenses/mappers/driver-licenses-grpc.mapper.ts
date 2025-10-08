import { RpcException } from '@nestjs/microservices';
import { CreateDriverLicenseGrpcDto } from '../dto';

export class DriverLicensesGrpcMapper {
  // Método para convertir IDs de gRPC
  static convertGrpcId(id: any): number {
    if (typeof id === 'object' && id !== null && 'low' in id) {
      return Number(id.low) || 0;
    }
    return Number(id) || 0;
  }

  static createLongObject(value: any): any {
    const numValue = Number(value) || 0;
    return {
      low: numValue,
      high: 0,
      unsigned: false
    };
  }

  // Mapper para crear DTO desde datos gRPC
  static mapCreateDataToDto(data: any): CreateDriverLicenseGrpcDto {
    return {
      driver_id: this.convertGrpcId(data.driverId),
      license_type_id: this.convertGrpcId(data.licenseTypeId),
      number: data.number,
      issued_at: data.issuedAt,
      expires_at: data.expiresAt,
      status: data.status ? this.mapProtoStatusToString(data.status) : undefined,
      version: data.version ? data.version : 0
    };
  }

  // Mapper para driver license a proto
  static mapDriverLicenseToProto(l: any) {
    if (!l) return null;

    return {
      driverLicenseId: this.createLongObject(l.driver_license_id),
      driverId: this.createLongObject(l.driver_id),
      licenseTypeId: this.createLongObject(l.license_type_id),
      number: l.number || '',
      issuedAt: l.issued_at ? this.toDateString(l.issued_at) : '',
      expiresAt: l.expires_at ? this.toDateString(l.expires_at) : '',
      status: this.mapLicenseStatusToProto(l.status),
      version: this.createLongObject(l.version || 0),
      licenseTypeCode: l.license_type?.code || l.license_type_code || '',
      licenseTypeDescription: l.license_type?.description || l.license_type_description || '',
      isActive: l.status === 'VALID',
    };
  }

  // Mapper para lista de driver licenses
  static mapDriverLicenseListToProto(items: any[]) {
    return {
      items: items.map(item => this.mapDriverLicenseToProto(item))
    };
  }

  // Mapper para datos de suspend
  static mapSuspendData(data: any): { driverId: number; licenseId: number } {
    return {
      driverId: this.convertGrpcId(data.driverId),
      licenseId: this.convertGrpcId(data.licenseId)
    };
  }

  // Mapper para datos de findByDriver
  static mapFindByDriverData(data: any): number {
    return this.convertGrpcId(data.driverId);
  }

  // Mapeo de estados
  static mapLicenseStatusToProto(status: string | undefined): number {
    if (!status) return 0; // LICENSE_STATUS_UNSPECIFIED
    switch (status.toUpperCase()) {
      case 'VALID': return 1;
      case 'EXPIRED': return 2;
      case 'SUSPENDED': return 3;
      default: return 0; // UNSPECIFIED
    }
  }

  static mapProtoStatusToString(status: number): string {
    switch (status) {
      case 1: return 'VALID';
      case 2: return 'EXPIRED';
      case 3: return 'SUSPENDED';
      default: return 'VALID'; // Por defecto VALID si no se especifica
    }
  }

  // Utilidades
  static toDateString(d: Date | string): string {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  static calculateDaysUntilExpiry(expiresAt: string): number {
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
}