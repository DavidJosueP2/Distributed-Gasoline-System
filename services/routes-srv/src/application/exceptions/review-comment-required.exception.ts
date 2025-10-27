import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export class ReviewCommentRequiredException extends RpcException {
  constructor(deviationPercentage: number) {
    super({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: `Desviación del ${deviationPercentage.toFixed(2)}% requiere comentario de revisión obligatorio`,
    });
  }
}
