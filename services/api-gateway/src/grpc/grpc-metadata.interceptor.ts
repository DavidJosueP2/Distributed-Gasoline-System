import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';

/**
 * Interceptor que traduce los headers HTTP a metadata de gRPC.
 *
 * - Toma headers como `Authorization` o `x-user-id` de la petición HTTP.
 * - Los coloca en un objeto `Metadata` de gRPC.
 * - Ese objeto se guarda en `req._grpcMetadata`.
 *
 * De esta forma, cuando el controller invoque un método gRPC, puede pasar
 * esa metadata y mantener autenticación/propagación de contexto:
 *
 *   svc.AlgunMetodoGrpc(reqBody, req._grpcMetadata)
 */

@Injectable()
export class GrpcMetadataInterceptor implements NestInterceptor {
    buildMetadataFromRequest(req: any): Metadata {
        const md = new Metadata();
        const auth = req.headers?.authorization || '';
        if (auth) md.add('authorization', auth);
        if (req.headers?.['x-user-id']) md.add('x-user-id', String(req.headers['x-user-id']));
        return md;
    }

    intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
        const http = ctx.switchToHttp();
        const req = http.getRequest();
        req._grpcMetadata = this.buildMetadataFromRequest(req);
        return next.handle().pipe(map(x => x));
    }
}
