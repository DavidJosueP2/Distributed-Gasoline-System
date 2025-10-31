import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class RouteNameAlreadyExistsException extends RpcException {
  constructor(routeName: string) {
    super({
      code: GrpcStatus.ALREADY_EXISTS,
      message: `Ya existe una ruta con el nombre '${routeName}'. El nombre de la ruta debe ser único.`,
    });
  }
}
