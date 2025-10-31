import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { flattenValidationErrors } from '../../infra/validation/field-error.util';

export function RpcExceptionFromValidationErrors(errors: any[]): RpcException {
  const fieldErrors = flattenValidationErrors(errors);
  return new RpcException({
    code: GrpcStatus.INVALID_ARGUMENT,
    message: 'Validation failed',
    details: JSON.stringify({ fieldErrors }),
  });
}
