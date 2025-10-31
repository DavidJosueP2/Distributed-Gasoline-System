import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class DriverBusyException extends RpcException {
  constructor(driverId: bigint, currentTripId: bigint) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El conductor con ID ${driverId} ya tiene un viaje activo (ID: ${currentTripId}). Un conductor no puede tener más de un viaje en estado CREADO, EN_RUTA o EN_REVISION simultáneamente.`,
    });
  }
}
