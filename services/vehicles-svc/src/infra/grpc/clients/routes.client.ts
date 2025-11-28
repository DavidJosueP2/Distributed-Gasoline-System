import { Injectable } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';

export interface TripsServiceClient {
  HasTripsByVehicle(data: { vehicleId: number }): Observable<{ hasTrips: boolean }>;
}

@Injectable()
export class RoutesClient {
  private tripsService: TripsServiceClient;

  constructor(private readonly client: ClientGrpc) {
    this.tripsService = this.client.getService<TripsServiceClient>('TripsService');
  }

  async hasTripsByVehicle(vehicleId: number): Promise<boolean> {
    const response = await lastValueFrom(
      this.tripsService.HasTripsByVehicle({ vehicleId })
    );
    return response.hasTrips;
  }
}

