import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { from, map, Observable, switchMap } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import type{
    CreateUserRequest,
    UpdateUserRequest,
    UserResponse,
    UserServiceClient,
    LongObject,
} from '../../grpc/clients/users.client';

type RequestWithGrpc = Request & { _grpcMetadata?: Record<string, unknown> };

type LongLike = string | number | LongObject | undefined | null;

const isLongObject = (value: unknown): value is LongObject =>
    typeof value === 'object' && value !== null && 'low' in (value as any) && 'high' in (value as any);

const toPlainNumber = (value: LongLike): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (isLongObject(value)) {
        if (typeof value.toNumber === 'function') {
            return value.toNumber();
        }
        const low = value.low >>> 0;
        const high = value.high >>> 0;
        return high * 2 ** 32 + low;
    }
    return Number(value as any);
};

const normalizeUser = (user: UserResponse): UserResponse => ({
    ...user,
    userId: toPlainNumber(user.userId),
    roles: user.roles?.map((role) => ({
        ...role,
        roleId: toPlainNumber(role.roleId),
    })) ?? [],
});

@Controller('users')
export class UsersController {
    constructor(private readonly factory: GrpcClientFactory) {}

    private async svc(req: RequestWithGrpc): Promise<UserServiceClient> {
        const appName = process.env.USERS_APP_NAME || 'USERS-SERVICE';
        const client = await this.factory.forService(appName, 'users', 'users.proto');
        return client.getService<UserServiceClient>('UserService');
    }

    @Get(':id')
    getOne(
        @Param('id') id: string,
        @Req() req: RequestWithGrpc,
    ): Observable<UserResponse> {
        return from(this.svc(req)).pipe(
            switchMap((svc) =>
                svc
                    .GetUser({ userId: id }, req._grpcMetadata)
                    .pipe(map(normalizeUser)),
            ),
        );
    }

    @Get()
    getAll(@Req() req: RequestWithGrpc): Observable<UserResponse[]> {
        return from(this.svc(req)).pipe(
            switchMap((svc) =>
                svc
                    .GetAllUsers({}, req._grpcMetadata)
                    .pipe(map((res) => res.items.map(normalizeUser))),
            ),
        );
    }

    @Post()
    create(
        @Body() dto: CreateUserRequest,
        @Req() req: RequestWithGrpc,
    ): Observable<UserResponse> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc
            .CreateUser(dto, req._grpcMetadata)
            .pipe(map(normalizeUser)))
        );
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateUserRequest,
        @Req() req: RequestWithGrpc,
    ): Observable<UserResponse> {
        dto.userId = id;
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.UpdateUser(dto, req._grpcMetadata).pipe(map(normalizeUser))),
        );
    }

    @Delete(':id')
    remove(
        @Param('id') id: string,
        @Req() req: RequestWithGrpc,
    ): Observable<{ success: boolean }> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.DeleteUser({ userId: id }, req._grpcMetadata)),
        );
    }

    @Post('/undelete/:id')
    unRemove(
        @Param('id') id: string,
        @Req() req: RequestWithGrpc,
    ): Observable<{ success: boolean }> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.UnDeleteUser({ userId: id }, req._grpcMetadata)),
        );
    }

            
}
