import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class DriverNotAtLocationException extends RpcException {
  constructor(expectedLat: number, expectedLng: number, actualLat: number, actualLng: number) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El conductor no se encuentra en la ubicación correcta para iniciar el viaje. Ubicación esperada: (${expectedLat}, ${expectedLng}), ubicación actual: (${actualLat}, ${actualLng}).`,
    });
  }
}
