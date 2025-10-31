import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class InvalidVehicleTypeException extends RpcException {
  constructor(vehicleType: string) {
    super({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: `Tipo de vehículo inválido: ${vehicleType}. Debe ser LIVIANO o PESADO`,
    });
  }
}
