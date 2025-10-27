import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class InvalidTripStatusTransitionException extends RpcException {
  constructor(currentStatus: string, targetStatus: string) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `No se puede cambiar de estado ${currentStatus} a ${targetStatus}`,
    });
  }
}
