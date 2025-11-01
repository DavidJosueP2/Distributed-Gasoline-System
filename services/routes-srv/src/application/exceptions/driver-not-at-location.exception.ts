import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class DriverNotAtLocationException extends RpcException {
  constructor(expectedLat: number, expectedLng: number, actualLat: number, actualLng: number, marginPercent?: number) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `El conductor no se encuentra en la ubicación de inicio del viaje. Ubicación esperada: (${expectedLat}, ${expectedLng}). Margen permitido: ${marginPercent}% de la distancia total.`,
    });
  }
}
