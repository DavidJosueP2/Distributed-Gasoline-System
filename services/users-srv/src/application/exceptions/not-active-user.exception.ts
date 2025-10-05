
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class NotUserActive extends RpcException {
  constructor(message?: string) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: message || 'El usuario no está activo',
    });
  }
}
