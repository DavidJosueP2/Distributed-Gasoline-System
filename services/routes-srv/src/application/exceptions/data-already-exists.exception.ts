import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class DataAlreadyExistsException extends RpcException {
  constructor(message?: string) {
    super({
      code: GrpcStatus.ALREADY_EXISTS,
      message: message || 'El dato ya existe',
    });
  }
}
