import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class DriverLicenseMismatchException extends RpcException {
  constructor(driverId: bigint, vehicleId: bigint, driverLicenses: string[], requiredLicenses: string[]) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El conductor con ID ${driverId} no tiene las licencias necesarias para manejar el vehículo con ID ${vehicleId}. Licencias del conductor: [${driverLicenses.join(', ')}]. Licencias requeridas: [${requiredLicenses.join(', ')}].`,
    });
  }
}
