import { Injectable } from '@nestjs/common';
import { Driver } from './entities/driver.entity';
import { DriverLicense } from '../driver-licenses/entities/driver-license.entity';
import { 
  DriverResponse, 
  DriverLicenseInfo, 
  DriverSummaryResponse,
  DriversListResponse,
  CanDriveResponse 
} from './dto/driver-response.dto';

@Injectable()
export class DriverTransformService {
  
  transformToFullResponse(driver: Driver): DriverResponse {
    const licenses = this.transformLicenses(driver.licenses || []);
    const summary = this.calculateSummary(licenses);
    
    return {
      driver_id: driver.driver_id,
      user_id: driver.user_id,
      availability: driver.availability as any,
      version: driver.version || 0,
      created_at: driver.created_at?.toISOString() || '',
      updated_at: driver.updated_at?.toISOString() || '',
      licenses,
      summary,
    };
  }

  transformToSummaryResponse(driver: Driver): DriverSummaryResponse {
    const licenses = driver.licenses || [];
    const today = new Date();
    
    const activeLicenses = licenses.filter(l => 
      l.status === 'VALID' && new Date(l.expires_at) >= today
    );
    
    return {
      driver_id: driver.driver_id,
      user_id: driver.user_id,
      availability: driver.availability,
      license_ids: licenses.map(l => l.driver_license_id),
      active_license_ids: activeLicenses.map(l => l.driver_license_id),
      license_types: [...new Set(licenses.map(l => l.license_type?.code).filter(Boolean))],
      can_drive_professionally: activeLicenses.some(l => l.license_type?.is_professional),
    };
  }

  transformToListResponse(drivers: Driver[], total?: number): DriversListResponse {
    return {
      drivers: drivers.map(d => this.transformToFullResponse(d)),
      total: total || drivers.length,
    };
  }

  createCanDriveResponse(
    canDrive: boolean, 
    matchingLicenses: DriverLicense[] = [],
    reason?: string
  ): CanDriveResponse {
    return {
      can_drive: canDrive,
      reason,
      matching_licenses: matchingLicenses.map(l => ({
        license_id: l.driver_license_id,
        license_type: l.license_type?.code || 'Unknown',
        expires_at: l.expires_at?.toString() || '',
      })),
    };
  }

  private transformLicenses(licenses: DriverLicense[]): DriverLicenseInfo[] {
    const today = new Date();
    
    return licenses.map(license => {
      const expiryDate = new Date(license.expires_at);
      const isActive = license.status === 'VALID' && expiryDate >= today;
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        driver_license_id: license.driver_license_id,
        license_type_id: license.license_type_id,
        license_type_code: license.license_type?.code || 'Unknown',
        license_type_description: license.license_type?.description || '',
        number: license.number,
        issued_at: license.issued_at?.toString() || '',
        expires_at: license.expires_at?.toString() || '',
        status: license.status as any,
        is_active: isActive,
        days_until_expiry: daysUntilExpiry > 0 ? daysUntilExpiry : undefined,
      };
    });
  }

  private calculateSummary(licenses: DriverLicenseInfo[]) {
    const active = licenses.filter(l => l.is_active).length;
    const expired = licenses.filter(l => l.status === 'EXPIRED').length;
    const suspended = licenses.filter(l => l.status === 'SUSPENDED').length;
    const licenseTypes = [...new Set(licenses.map(l => l.license_type_code))];
    
    return {
      total_licenses: licenses.length,
      active_licenses: active,
      expired_licenses: expired,
      suspended_licenses: suspended,
      license_types: licenseTypes,
    };
  }
}