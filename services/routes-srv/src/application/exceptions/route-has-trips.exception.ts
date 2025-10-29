import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class RouteHasTripsException extends RpcException {
  constructor(routeId: bigint) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `No se puede eliminar la ruta con ID ${routeId} porque tiene viajes relacionados. Primero elimine todos los viajes asociados a esta ruta.`,
    });
  }
}
