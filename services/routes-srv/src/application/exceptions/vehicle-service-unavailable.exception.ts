import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class VehicleServiceUnavailableException extends RpcException {
  constructor(vehicleId: bigint) {
    super({
      code: GrpcStatus.UNAVAILABLE,
      message: `Servicio de vehículos no disponible para obtener información del vehículo ${vehicleId}`,
    });
  }
}
