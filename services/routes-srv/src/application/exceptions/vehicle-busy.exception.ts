import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class VehicleBusyException extends RpcException {
  constructor(vehicleId: bigint, currentTripId: bigint) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El vehículo con ID ${vehicleId} ya está siendo utilizado en un viaje activo (ID: ${currentTripId}). Un vehículo no puede estar asignado a más de un viaje en estado CREADO, EN_RUTA o EN_REVISION simultáneamente.`,
    });
  }
}
