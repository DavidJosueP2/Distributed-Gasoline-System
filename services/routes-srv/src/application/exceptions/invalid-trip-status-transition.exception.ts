import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class InvalidTripStatusTransitionException extends RpcException {
  constructor(currentStatus: string, targetStatus: string) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El viaje no puede iniciarse porque ya está ${currentStatus === 'EN_RUTA' ? 'en ruta' : `en estado ${currentStatus}`}`,
    });
  }
}
