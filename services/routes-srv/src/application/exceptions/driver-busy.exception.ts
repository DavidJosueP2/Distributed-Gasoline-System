import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class DriverBusyException extends RpcException {
  constructor(driverId: bigint, currentTripId: bigint) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `Ya tiene un viaje en ruta. No puede tener más de uno simultáneamente (ID: ${currentTripId}).`,
    });
  }
}
