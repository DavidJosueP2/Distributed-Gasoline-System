import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { Reflector } from '@nestjs/core';

/**
 * Interceptor que traduce los headers HTTP a metadata de gRPC.
 *
 * - Toma headers como `Authorization` de la petición HTTP.
 * - Los coloca en un objeto `Metadata` de gRPC.
 * - Ese objeto se guarda en `req._grpcMetadata`.
 *
 * De esta forma, cuando el controller invoque un método gRPC, puede pasar
 * esa metadata y mantener autenticación/propagación de contexto:
 *
 *   svc.AlgunMetodoGrpc(reqBody, req._grpcMetadata)
 */

// Ejeuta logica antes o despues del handler del controller.
@Injectable()
export class GrpcMetadataInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector
  ) { }

  buildMetadataFromRequest(req: any): Metadata {
    const md = new Metadata();
    const auth = req.headers?.authorization || '';
    if (auth) md.add('authorization', auth);
    return md;
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      'isPublic',
      [ctx.getHandler(), ctx.getClass()],
    );

    // Sino, agrega metadatos.
    if (!isPublic) {
      const req = ctx.switchToHttp().getRequest();
      req._grpcMetadata = this.buildMetadataFromRequest(req);
    }

    // Si es publica, continua.
    return next.handle();
  }
}
