import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class UnauthorizedSupervisorException extends RpcException {
  constructor(supervisorId: bigint, tripId: bigint) {
    super({
      code: GrpcStatus.PERMISSION_DENIED,
      message: `El supervisor con ID ${supervisorId} no está autorizado para revisar el viaje ${tripId}. Solo el supervisor asignado puede revisar este viaje.`,
    });
  }
}
