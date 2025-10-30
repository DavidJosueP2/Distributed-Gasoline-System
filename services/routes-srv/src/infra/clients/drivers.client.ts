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
  FindOne(data: { id: number }): Observable<DriverResponse>;
  Update(data: { id: number; availability: string }): Observable<any>;
  CanDrive(data: { driverId: number; vehicleId: number }): Observable<{ canDrive: boolean }>;
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

  async canDrive(driverId: bigint, vehicleId: bigint): Promise<boolean> {
    const response = await lastValueFrom(
      this.driversService.CanDrive({ 
        driverId: Number(driverId), 
        vehicleId: Number(vehicleId) 
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
}
