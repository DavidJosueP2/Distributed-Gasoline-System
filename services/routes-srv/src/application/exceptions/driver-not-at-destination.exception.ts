import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class DriverNotAtDestinationException extends RpcException {
  constructor(expectedLat: number, expectedLng: number, actualLat: number, actualLng: number, margin: number) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El conductor no se encuentra en el destino correcto para finalizar el viaje. Destino esperado: (${expectedLat}, ${expectedLng}), ubicación actual: (${actualLat}, ${actualLng}). Margen permitido: ${margin}%.`,
    });
  }
}
