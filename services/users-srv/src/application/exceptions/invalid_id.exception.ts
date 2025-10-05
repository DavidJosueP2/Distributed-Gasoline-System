import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class InvalidIdentifierException extends RpcException {
  constructor(message?: string) {
    super({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: message || 'Identificador no válido',
    });
  }
}
