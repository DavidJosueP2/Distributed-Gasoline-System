import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { from, map, Observable, switchMap } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import {
    CreateUserRequest,
    UpdateUserRequest,
    UserResponse,
    UserServiceClient,
} from '../../grpc/clients/users.client';

interface RoleHttpDto {
    roleId: string;
    name: string;
}

interface UserHttpDto {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    username: string;
    status: string;
    roles: RoleHttpDto[];
}

interface CreateUserHttpDto {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    username: string;
    password: string;
    status?: string;
    roleIds?: Array<string | number>;
}

interface UpdateUserHttpDto extends Partial<CreateUserHttpDto> {}

type RequestWithGrpc = Request & { _grpcMetadata?: Record<string, unknown> };

@Controller('users')
export class UsersController {
    constructor(private readonly factory: GrpcClientFactory) {}

    private async svc(req: RequestWithGrpc): Promise<UserServiceClient> {
        const appName = process.env.USERS_APP_NAME || 'USERS-SERVICE';
        const client = await this.factory.forService(appName, 'users', 'users.proto');
        return client.getService<UserServiceClient>('UserService');
    }

    private mapToHttp(user: UserResponse): UserHttpDto {
        const rawUser = user as unknown as Record<string, any>;
        // Debug output to understand incoming shape from gRPC
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[gateway] Raw gRPC user payload:', rawUser);
        }
        const userId = rawUser.user_id ?? rawUser.userId ?? rawUser.id;
        const firstName = rawUser.first_name ?? rawUser.firstName ?? '';
        const lastName = rawUser.last_name ?? rawUser.lastName ?? '';
        const roles = Array.isArray(rawUser.roles) ? rawUser.roles : [];

        return {
            userId: userId !== undefined ? String(userId) : '',
            firstName,
            lastName,
            email: rawUser.email ?? '',
            phone: rawUser.phone ?? null,
            username: rawUser.username ?? '',
            status: rawUser.status ?? '',
            roles: roles.map((role: any) => {
                const roleId = role?.role_id ?? role?.roleId ?? role?.id;
                return {
                    roleId: roleId !== undefined ? String(roleId) : '',
                    name: role?.name ?? '',
                };
            }),
        };
    }

    private toCreateRequest(dto: CreateUserHttpDto): CreateUserRequest {
        return {
            first_name: dto.firstName,
            last_name: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            username: dto.username,
            password: dto.password,
            status: dto.status,
            role_ids: dto.roleIds?.map((id) => String(id)),
        };
    }

    private toUpdateRequest(id: string, dto: UpdateUserHttpDto): UpdateUserRequest {
        return {
            user_id: id,
            first_name: dto.firstName,
            last_name: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            username: dto.username,
            password: dto.password,
            status: dto.status,
            role_ids: dto.roleIds?.map((rid) => String(rid)),
        };
    }

    @Get(':id')
    @GrpcTimeout(1500)
    getOne(@Param('id') id: string, @Req() req: RequestWithGrpc): Observable<UserHttpDto> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.GetUser({ user_id: id }, req._grpcMetadata)),
            map((user) => this.mapToHttp(user)),
        );
    }

    @Get()
    getAll(@Req() req: RequestWithGrpc): Observable<UserHttpDto[]> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.GetAllUsers({}, req._grpcMetadata)),
            map((res) => res.items.map((user) => this.mapToHttp(user))),
        );
    }

    @Post()
    create(@Body() dto: CreateUserHttpDto, @Req() req: RequestWithGrpc): Observable<UserHttpDto> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.CreateUser(this.toCreateRequest(dto), req._grpcMetadata)),
            map((user) => this.mapToHttp(user)),
        );
    }

    @Put(':id')
    @GrpcTimeout(1500)
    replace(
        @Param('id') id: string,
        @Body() dto: UpdateUserHttpDto,
        @Req() req: RequestWithGrpc,
    ): Observable<UserHttpDto> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.UpdateUser(this.toUpdateRequest(id, dto), req._grpcMetadata)),
            map((user) => this.mapToHttp(user)),
        );
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateUserHttpDto,
        @Req() req: RequestWithGrpc,
    ): Observable<UserHttpDto> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.UpdateUser(this.toUpdateRequest(id, dto), req._grpcMetadata)),
            map((user) => this.mapToHttp(user)),
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: RequestWithGrpc): Observable<{ success: boolean }> {
        return from(this.svc(req)).pipe(
            switchMap((svc) => svc.DeleteUser({ user_id: id }, req._grpcMetadata)),
        );
    }
}
