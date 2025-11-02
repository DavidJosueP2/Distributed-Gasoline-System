// src/common/auth/decorators/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';

export const GetUserInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // En gRPC de Nest, getContext() retorna la instancia de Metadata
    const metadata = ctx.switchToRpc().getContext<Metadata>();
    return metadata;
  },
);

