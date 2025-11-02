import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class InvalidOdometerReadingException extends RpcException {
  constructor(odometerStart: number, odometerEnd: number) {
    super({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: `Lectura de odómetro inválida: odómetro final (${odometerEnd}) debe ser mayor al inicial (${odometerStart})`,
    });
  }
}
