import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Prisma as P } from '@prisma/client';

export class GrpcErrorMapper {
    static toRpc(e: unknown): RpcException {
        if (e instanceof RpcException) return e;

        if (this.isPrismaKnown(e)) {
            switch (e.code) {
                case 'P2002':
                    return new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message: this.metaMsg(e, 'Unique constraint violated') });
                case 'P2003':
                    return new RpcException({ code: GrpcStatus.FAILED_PRECONDITION, message: this.metaMsg(e, 'Foreign key constraint failed') });
                case 'P2004':
                    return new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message: this.metaMsg(e, 'Constraint/check failed') });
                case 'P2025':
                    return new RpcException({ code: GrpcStatus.NOT_FOUND, message: this.metaMsg(e, 'Record not found') });
                default:
                    return new RpcException({ code: GrpcStatus.UNKNOWN, message: this.metaMsg(e, 'Database error') });
            }
        }

        if (this.isPgNowaitError(e)) {
            return new RpcException({ code: GrpcStatus.RESOURCE_EXHAUSTED, message: 'Row is locked (NOWAIT)' });
        }

        const message = e instanceof Error ? e.message : 'Unknown error';
        return new RpcException({ code: GrpcStatus.UNKNOWN, message });
    }

    private static isPrismaKnown(e: any): e is P.PrismaClientKnownRequestError {
        return !!e && typeof e.code === 'string' && !!e.clientVersion;
    }
    private static metaMsg(e: any, fallback: string): string {
        return e?.meta ? `${fallback}: ${JSON.stringify(e.meta)}` : fallback;
    }
    private static isPgNowaitError(e: any): boolean {
        return !!e && (e.code === '55P03' || /could not obtain lock/i.test(e?.message ?? ''));
    }
}
