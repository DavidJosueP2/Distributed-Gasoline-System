import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class TripNotInCorrectStatusException extends RpcException {
  constructor(requiredStatus: string, currentStatus: string) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El viaje debe estar en estado ${requiredStatus}, pero está en ${currentStatus}`,
    });
  }
}
