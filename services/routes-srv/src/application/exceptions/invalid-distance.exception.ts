import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class InvalidDistanceException extends RpcException {
  constructor(distance: number) {
    super({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: `Distancia inválida: ${distance}. Debe ser mayor a 0`,
    });
  }
}
