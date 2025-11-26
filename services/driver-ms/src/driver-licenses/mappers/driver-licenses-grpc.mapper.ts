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
    // ⬅️ Con longs: Number en el servidor, devolver número directamente
    return Number(value) || 0;
  }

  // Mapper para crear DTO desde datos gRPC
  static mapCreateDataToDto(data: any): CreateDriverLicenseGrpcDto {
    console.log('🔍 DriverLicensesGrpcMapper.mapCreateDataToDto - Input data:', JSON.stringify(data, null, 2));
    
    // Buscar driver_id en ambos formatos (snake_case primero, luego camelCase)
    // El proto-loader puede transformar snake_case a camelCase, pero debemos priorizar snake_case
    const driverIdField = data.driver_id !== undefined ? data.driver_id : data.driverId;
    const licenseTypeIdField = data.license_type_id !== undefined ? data.license_type_id : data.licenseTypeId;
    const issuedAtField = data.issued_at !== undefined ? data.issued_at : data.issuedAt;
    const expiresAtField = data.expires_at !== undefined ? data.expires_at : data.expiresAt;
    
    console.log('🔍 Extracted fields:', {
      driverIdField,
      licenseTypeIdField,
      issuedAtField,
      expiresAtField,
      'data.driver_id': data.driver_id,
      'data.driverId': data.driverId,
      'data.license_type_id': data.license_type_id,
      'data.licenseTypeId': data.licenseTypeId,
    });
    
    const driverId = this.convertGrpcId(driverIdField);
    const licenseTypeId = this.convertGrpcId(licenseTypeIdField);
    
    console.log('🔍 Converted IDs:', { driverId, licenseTypeId });
    
    if (!driverId || driverId <= 0) {
      throw new RpcException(`Invalid driver_id: ${JSON.stringify(driverIdField)} (type: ${typeof driverIdField}) converted to ${driverId}. Available fields: ${JSON.stringify(Object.keys(data))}`);
    }
    
    if (!licenseTypeId || licenseTypeId <= 0) {
      throw new RpcException(`Invalid license_type_id: ${JSON.stringify(licenseTypeIdField)} (type: ${typeof licenseTypeIdField}) converted to ${licenseTypeId}. Available fields: ${JSON.stringify(Object.keys(data))}`);
    }
    
    return {
      driver_id: driverId,
      license_type_id: licenseTypeId,
      number: data.number,
      issued_at: issuedAtField,
      expires_at: expiresAtField,
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
    console.log('🔍 DriverLicensesGrpcMapper.mapSuspendData - Input data:', JSON.stringify(data, null, 2));
    
    // Buscar en ambos formatos (snake_case primero, luego camelCase)
    const driverIdField = data.driver_id !== undefined ? data.driver_id : data.driverId;
    const licenseIdField = data.license_id !== undefined ? data.license_id : data.licenseId;
    
    console.log('🔍 Extracted fields:', {
      driverIdField,
      licenseIdField,
      'data.driver_id': data.driver_id,
      'data.driverId': data.driverId,
      'data.license_id': data.license_id,
      'data.licenseId': data.licenseId,
    });
    
    const driverId = this.convertGrpcId(driverIdField);
    const licenseId = this.convertGrpcId(licenseIdField);
    
    console.log('🔍 Converted IDs:', { driverId, licenseId });
    
    if (!driverId || driverId <= 0) {
      throw new RpcException(`Invalid driver_id: ${JSON.stringify(driverIdField)} (type: ${typeof driverIdField}) converted to ${driverId}. Available fields: ${JSON.stringify(Object.keys(data))}`);
    }
    
    if (!licenseId || licenseId <= 0) {
      throw new RpcException(`Invalid license_id: ${JSON.stringify(licenseIdField)} (type: ${typeof licenseIdField}) converted to ${licenseId}. Available fields: ${JSON.stringify(Object.keys(data))}`);
    }
    
    return {
      driverId,
      licenseId
    };
  }

  // Mapper para datos de reactivate (similar a suspend)
  static mapReactivateData(data: any): { driverId: number; licenseId: number } {
    return this.mapSuspendData(data); // Misma estructura que suspend
  }

  // Mapper para datos de update
  static mapUpdateData(data: any): { driverId: number; licenseId: number; updateDto: any } {
    console.log('🔍 DriverLicensesGrpcMapper.mapUpdateData - Input data:', JSON.stringify(data, null, 2));
    
    // Buscar en ambos formatos (snake_case primero, luego camelCase)
    const driverIdField = data.driver_id !== undefined ? data.driver_id : data.driverId;
    const licenseIdField = data.license_id !== undefined ? data.license_id : data.licenseId;
    
    const driverId = this.convertGrpcId(driverIdField);
    const licenseId = this.convertGrpcId(licenseIdField);
    
    if (!driverId || driverId <= 0) {
      throw new RpcException(`Invalid driver_id: ${JSON.stringify(driverIdField)} converted to ${driverId}`);
    }
    
    if (!licenseId || licenseId <= 0) {
      throw new RpcException(`Invalid license_id: ${JSON.stringify(licenseIdField)} converted to ${licenseId}`);
    }

    const licenseTypeIdField = data.license_type_id ?? data.licenseTypeId;
    const updateDto: any = {};

    if (licenseTypeIdField !== undefined && licenseTypeIdField !== null) {
      const licenseTypeId = this.convertGrpcId(licenseTypeIdField);
      if (licenseTypeId > 0) {
        updateDto.license_type_id = licenseTypeId;
      }
    }

    if (data.number !== undefined && data.number !== null && data.number !== '') {
      updateDto.number = data.number;
    }

    if (data.issued_at !== undefined && data.issued_at !== null && data.issued_at !== '') {
      updateDto.issued_at = data.issued_at;
    }

    if (data.expires_at !== undefined && data.expires_at !== null && data.expires_at !== '') {
      updateDto.expires_at = data.expires_at;
    }

    if (data.status !== undefined && data.status !== null && data.status !== '') {
      updateDto.status = this.mapProtoStatusToString(
        typeof data.status === 'number' ? data.status : Number(data.status)
      );
    }
    
    return {
      driverId,
      licenseId,
      updateDto
    };
  }

  // Mapper para datos de findByDriver
  static mapFindByDriverData(data: any): number {
    console.log('🔍 DriverLicensesGrpcMapper.mapFindByDriverData - Input data:', JSON.stringify(data, null, 2));
    
    // Buscar en ambos formatos (snake_case primero, luego camelCase)
    const driverIdField = data.driver_id !== undefined ? data.driver_id : data.driverId;
    
    console.log('🔍 Extracted driverIdField:', {
      driverIdField,
      'data.driver_id': data.driver_id,
      'data.driverId': data.driverId,
    });
    
    const driverId = this.convertGrpcId(driverIdField);
    
    console.log('🔍 Converted driverId:', driverId);
    
    if (!driverId || driverId <= 0) {
      throw new RpcException(`Invalid driver_id: ${JSON.stringify(driverIdField)} (type: ${typeof driverIdField}) converted to ${driverId}. Available fields: ${JSON.stringify(Object.keys(data))}`);
    }
    
    return driverId;
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