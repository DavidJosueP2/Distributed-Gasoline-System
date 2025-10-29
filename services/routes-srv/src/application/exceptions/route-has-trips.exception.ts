import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class RouteHasTripsException extends RpcException {
  constructor(routeName: string) {
    super({
      code: GrpcStatus.FAILED_PRECONDITION,
      message: `No se puede eliminar la ruta '${routeName}' porque ya tiene viajes asociados.`,
    });
  }
}
