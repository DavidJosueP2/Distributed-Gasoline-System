import { lastValueFrom, Observable } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

/**
 * Wrapper para ejecutar llamadas gRPC con manejo uniforme de errores.
 * 
 * @param call Observable devuelto por el cliente gRPC
 * @param context Texto opcional para logs o debugging
 */
export async function safeGrpcCall<T>(
  call: Observable<T>,
  context?: string,
): Promise<T> {
  try {
    return await lastValueFrom(call);
  } catch (err: any) {
    // Si el error viene de otro microservicio
    if (err.code && typeof err.code === 'number') {
      throw new RpcException({
        code: err.code,
        message: err.details || err.message || 'Error remoto',
      });
    }

    // Si es un error sin code (o interno)
    throw new RpcException({
      code: GrpcStatus.UNKNOWN,
      message: `Error interno en ${context ?? 'llamada gRPC'}`,
    });
  }
}
