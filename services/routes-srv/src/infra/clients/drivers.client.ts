import { Injectable } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

export interface DriverInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  licenses?: string[];
}

export interface DriverResponse {
  driverId: number;
  userId?: number;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  licenses?: string[];
}

export interface DriverSummary {
  licenseTypes?: string[];
  license_types?: string[];
  totalLicenses?: number;
  total_licenses?: number;
  activeLicenses?: number;
  active_licenses?: number;
  expiredLicenses?: number;
  expired_licenses?: number;
  suspendedLicenses?: number;
  suspended_licenses?: number;
}

export interface DriverListItem {
  driverId: number;
  driver_id?: number;
  id?: number;
  userId?: number | { low?: number; high?: number };
  user_id?: number | { low?: number; high?: number };
  summary?: DriverSummary;
  availability?: number | string;
}

export interface DriversListResponse {
  drivers: DriverListItem[];
  total?: number;
}

export interface DriversServiceClient {
  FindAll(data: {}): Observable<DriversListResponse>;
  FindOne(data: { id: number }): Observable<DriverResponse>;
  FindByUserId(data: { userId: number }): Observable<DriverResponse>;
  Update(data: { id: number; availability: string }): Observable<any>;
  CanDrive(data: { driverId: number; licenseTypeId: number }): Observable<{ canDrive: boolean; reason?: string; matchingLicenses?: any[] }>;
}

@Injectable()
export class DriversClient {
  private driversService: DriversServiceClient;

  constructor(private readonly client: ClientGrpc) {
    this.driversService = this.client.getService<DriversServiceClient>('DriversService');
  }

  async getDriverInfo(driverId: bigint, usersClient?: any): Promise<DriverInfo> {
    const response = await lastValueFrom(
      this.driversService.FindOne({ id: Number(driverId) })
    );
    
    // Si tenemos usersClient, obtener firstName, lastName, email
    if (usersClient && response.userId != null) {
      try {
        // Convertir userId de Long de gRPC si es necesario (igual que en getAssignableDrivers)
        const userId = BigInt(response.userId || 0);
        
        const userInfo = await usersClient.getUserInfo(userId);
        return {
          id: response.driverId,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          licenses: response.licenses || [],
        };
      } catch (error) {
        // Si falla, devolver datos básicos
        return {
          id: response.driverId,
          firstName: 'Unknown',
          lastName: 'User',
          email: '',
          licenses: response.licenses || [],
        };
      }
    }
    
    // Sin usersClient, devolver datos básicos
    return {
      id: response.driverId,
      firstName: 'Unknown',
      lastName: 'User',
      email: '',
      licenses: response.licenses || [],
    };
  }

  async getDriverIdByUserId(userId: bigint): Promise<bigint> {
    const response = await lastValueFrom(
      this.driversService.FindByUserId({ userId: Number(userId) })
    );
    return BigInt(response.driverId);
  }

  async canDrive(driverId: bigint, licenseTypeId: bigint): Promise<boolean> {
    const response = await lastValueFrom(
      this.driversService.CanDrive({ 
        driverId: Number(driverId), 
        licenseTypeId: Number(licenseTypeId) 
      })
    );
    return response.canDrive;
  }

  async updateDriverToOnRoute(driverId: bigint): Promise<any> {
    return lastValueFrom(
      this.driversService.Update({
        id: Number(driverId),
        availability: 'ON_ROUTE',
      })
    );
  }

  async updateDriverToAvailable(driverId: bigint): Promise<any> {
    console.log(`[DriversClient] Actualizando driver ${driverId} a AVAILABLE...`);
    const result = await lastValueFrom(
      this.driversService.Update({
        id: Number(driverId),
        availability: 'AVAILABLE',
      })
    );
    console.log(`[DriversClient] Driver ${driverId} actualizado exitosamente:`, result);
    return result;
  }
  
  async getAllDrivers(): Promise<DriverListItem[]> {
    const response: any = await lastValueFrom(this.driversService.FindAll({}));
    // Manejar ambos casos: camelCase y snake_case (viene desde gRPC)
    const drivers = response.drivers || [];
    return drivers.map((driver: any) => ({
      driverId: driver.driverId || driver.driver_id || driver.id || 0,
      id: driver.id || driver.driverId || driver.driver_id,
      userId: driver.userId || driver.user_id,
      summary: driver.summary || {},
      availability: driver.availability,
      ...driver
    }));
  }
}
