import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Observable, timeout } from 'rxjs';

export const GRPC_TIMEOUT = 'GRPC_TIMEOUT';
export const GrpcTimeout = (ms: number) => SetMetadata(GRPC_TIMEOUT, ms);

@Injectable()
export class GrpcTimeoutInterceptor implements NestInterceptor {
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
        const handler = ctx.getHandler();
        // lee override por handler (decorador @GrpcTimeout)
        const override = Reflect.getMetadata(GRPC_TIMEOUT, handler);
        const ms = Number(override ?? process.env.GRPC_CALL_TIMEOUT_MS ?? 3000);
        return next.handle().pipe(timeout(ms));
    }
}
