import { CallHandler, ExecutionContext, Injectable, NestInterceptor, HttpException } from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { status as GrpcStatus } from '@grpc/grpc-js';

function grpcToHttp(code?: number): number {
    switch (code) {
        case GrpcStatus.INVALID_ARGUMENT:    return 400;
        case GrpcStatus.UNAUTHENTICATED:     return 401;
        case GrpcStatus.PERMISSION_DENIED:   return 403;
        case GrpcStatus.NOT_FOUND:           return 404;
        case GrpcStatus.ALREADY_EXISTS:      return 409;
        case GrpcStatus.FAILED_PRECONDITION: return 412;
        case GrpcStatus.OUT_OF_RANGE:        return 422;
        case GrpcStatus.RESOURCE_EXHAUSTED:  return 429;
        case GrpcStatus.CANCELLED:           return 499;
        case GrpcStatus.DEADLINE_EXCEEDED:   return 504;
        case GrpcStatus.UNAVAILABLE:         return 503;
        case GrpcStatus.INTERNAL:            return 502;
        default:                             return 502;
    }
}

function grpcName(code?: number): string {
    const map: Record<number, string> = {
        [GrpcStatus.OK]: 'OK',
        [GrpcStatus.CANCELLED]: 'CANCELLED',
        [GrpcStatus.UNKNOWN]: 'UNKNOWN',
        [GrpcStatus.INVALID_ARGUMENT]: 'INVALID_ARGUMENT',
        [GrpcStatus.DEADLINE_EXCEEDED]: 'DEADLINE_EXCEEDED',
        [GrpcStatus.NOT_FOUND]: 'NOT_FOUND',
        [GrpcStatus.ALREADY_EXISTS]: 'ALREADY_EXISTS',
        [GrpcStatus.PERMISSION_DENIED]: 'PERMISSION_DENIED',
        [GrpcStatus.RESOURCE_EXHAUSTED]: 'RESOURCE_EXHAUSTED',
        [GrpcStatus.FAILED_PRECONDITION]: 'FAILED_PRECONDITION',
        [GrpcStatus.ABORTED]: 'ABORTED',
        [GrpcStatus.OUT_OF_RANGE]: 'OUT_OF_RANGE',
        [GrpcStatus.UNIMPLEMENTED]: 'UNIMPLEMENTED',
        [GrpcStatus.INTERNAL]: 'INTERNAL',
        [GrpcStatus.UNAVAILABLE]: 'UNAVAILABLE',
        [GrpcStatus.DATA_LOSS]: 'DATA_LOSS',
        [GrpcStatus.UNAUTHENTICATED]: 'UNAUTHENTICATED',
    };
    return map[code ?? -1] ?? 'UNKNOWN';
}

function stripGrpcPrefix(msg?: any): string | undefined {
    if (typeof msg !== 'string') return undefined;
    return msg.replace(/^\s*\d+\s+[A-Z_]+:\s*/,'').trim();
}

function tryParseJson<T = any>(s?: any): T | undefined {
    if (typeof s !== 'string') return undefined;
    const t = s.trim();
    if (!t.startsWith('{') && !t.startsWith('[')) return undefined;
    try { return JSON.parse(t) as T; } catch { return undefined; }
}

function detectTransportCause(e: any) {
    const text = [e?.details, e?.message, e?.error?.message].filter(Boolean).join(' | ');
    const cause: any = {};
    if (/ECONNREFUSED/i.test(text)) cause.errno = 'ECONNREFUSED';
    if (/ETIMEDOUT/i.test(text))   cause.errno = 'ETIMEDOUT';
    if (/ENOTFOUND/i.test(text))   cause.errno = 'ENOTFOUND';
    if (/ECONNRESET/i.test(text))  cause.errno = 'ECONNRESET';
    const addr = text.match(/(\d{1,3}(\.\d{1,3}){3}):(\d{2,5})/);
    if (addr) { cause.address = addr[1]; cause.port = Number(addr[3]); }
    return Object.keys(cause).length ? cause : undefined;
}

function reasonFor(code?: number, causeErrno?: string): string {
    if (code === GrpcStatus.INVALID_ARGUMENT) return 'VALIDATION_ERROR';
    if (code === GrpcStatus.DEADLINE_EXCEEDED) return 'UPSTREAM_TIMEOUT';
    if (code === GrpcStatus.UNAVAILABLE) {
        if (causeErrno === 'ECONNREFUSED') return 'UPSTREAM_REFUSED';
        if (causeErrno === 'ENOTFOUND')    return 'UPSTREAM_DNS_ERROR';
        if (causeErrno === 'ETIMEDOUT')    return 'UPSTREAM_CONNECT_TIMEOUT';
        return 'UPSTREAM_UNAVAILABLE';
    }
    if (code === GrpcStatus.INTERNAL) return 'UPSTREAM_FAILURE';
    return 'UPSTREAM_ERROR';
}

@Injectable()
export class GrpcErrorInterceptor implements NestInterceptor {
    intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            catchError((e: any) => {
                const code  = e?.code ?? e?.error?.code;
                const http  = grpcToHttp(code);
                const gname = grpcName(code);

                let parsed = tryParseJson(e?.details ?? e?.error?.details);
                if (!parsed) parsed = tryParseJson(stripGrpcPrefix(e?.message ?? e?.error?.message));

                if (parsed?.fieldErrors && typeof parsed.fieldErrors === 'object') {
                    return throwError(() => new HttpException({
                        statusCode: http,
                        message: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        grpc: { code, name: gname },
                        errors: parsed.fieldErrors,
                    }, http));
                }

                const cause = detectTransportCause(e);
                const cleanMsg = stripGrpcPrefix(e?.message ?? e?.error?.message) || e?.details || 'Upstream error';
                const reason = reasonFor(code, cause?.errno);

                return throwError(() => new HttpException({
                    statusCode: http,
                    message: (code === GrpcStatus.UNAVAILABLE && cause?.errno === 'ECONNREFUSED')
                        ? 'Upstream connection refused'
                        : (code === GrpcStatus.DEADLINE_EXCEEDED)
                            ? 'Upstream timeout'
                            : cleanMsg,
                    code: reason,
                    grpc: { code, name: gname },
                    details: e?.details ?? undefined,
                    cause: cause ?? undefined,
                }, http));
            }),
        );
    }
}
