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
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  licenses?: string[];
}

export interface DriversServiceClient {
  FindAll(data: {}): Observable<any>;
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

  async getDriverInfo(driverId: bigint): Promise<DriverInfo> {
    const response = await lastValueFrom(
      this.driversService.FindOne({ id: Number(driverId) })
    );
    
    return {
      id: response.driverId,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      email: response.user.email,
      licenses: response.licenses,
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
    return lastValueFrom(
      this.driversService.Update({
        id: Number(driverId),
        availability: 'AVAILABLE',
      })
    );
  }
  
  async getAllDrivers(): Promise<any[]> {
    const response = await lastValueFrom(this.driversService.FindAll({}));
    return response.drivers || [];
  }
}
