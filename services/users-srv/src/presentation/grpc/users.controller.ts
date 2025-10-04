import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus, Metadata } from '@grpc/grpc-js';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersApplicationService } from '../../application/services/users-application.service';

import { UserMapper } from '../../application/mappers/user.mapper';
import { flattenValidationErrors } from '../../validation/field-error.util';
import { CreateUserDto } from 'src/application/dto/request/create-user-request';
import { UpdateUserDto } from 'src/application/dto/request/update-user-request';
import { FindUserByEmailRequest } from 'src/application/dto/request/find-user-by-email-reques';
import { Roles } from 'src/common/auth';

type StringLike = string | number | bigint | undefined | null;

interface UserIdPayload {
  user_id?: StringLike;
}


interface CreateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  username?: string;
  password?: string;
  status?: string;
  role_ids?: StringLike[];
}

interface UpdateUserPayload extends CreateUserPayload {
  user_id?: StringLike;
}

@Controller()
export class UsersGrpcController {
  constructor(private readonly service: UsersApplicationService) { }


  @GrpcMethod('UserService', 'GetUser')
  async getUser(data: UserIdPayload) {
    const id = this.coerceId(data.user_id);
    const user = await this.service.getUserById(id);
    return UserMapper.toGrpc(user);
  }

  @GrpcMethod('UserService', 'GetUserByEmail')
  async getUserByEmail(data: FindUserByEmailRequest) {
    const user = await this.service.getUserByEmail(data);
    return UserMapper.toGrpcByEmail(user);
  }

  @Roles('Testing ')
  @GrpcMethod('UserService', 'GetAllUsers')
  async getAll(req: {}, metadata?: Metadata) {
    const users = await this.service.getAllUsers({}, metadata);
    const grpcResult = UserMapper.toGrpcList(users);
    return grpcResult;
  }

  @GrpcMethod('UserService', 'CreateUser')
  async create(data: CreateUserPayload) {
    const dto = await this.validatePayload(CreateUserDto, this.mapCreatePayload(data));
    const user = await this.service.createUser(dto);
    return UserMapper.toGrpc(user);
  }

  @GrpcMethod('UserService', 'UpdateUser')
  async update(data: UpdateUserPayload) {
    const dto = await this.validatePayload(UpdateUserDto, this.mapUpdatePayload(data));
    const user = await this.service.updateUser(dto);
    return UserMapper.toGrpc(user);
  }

  @GrpcMethod('UserService', 'DeleteUser')
  async delete(data: UserIdPayload) {
    const id = this.coerceId(data.user_id);
    await this.service.deleteUser(id);
    return { success: true };
  }

  private mapCreatePayload(payload: CreateUserPayload): Partial<CreateUserDto> {
    return {
      firstName: payload.first_name,
      lastName: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      username: payload.username,
      password: payload.password,
      status: payload.status,
      roleIds: payload.role_ids?.map((id) => this.coerceId(id)),
    } satisfies Partial<CreateUserDto>;
  }

  private mapUpdatePayload(payload: UpdateUserPayload): Partial<UpdateUserDto> {
    return {
      userId: payload.user_id !== undefined ? this.coerceId(payload.user_id) : undefined,
      firstName: payload.first_name,
      lastName: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      username: payload.username,
      password: payload.password,
      status: payload.status,
      roleIds: payload.role_ids?.map((id) => this.coerceId(id)),
    } satisfies Partial<UpdateUserDto>;
  }

  private coerceId(value: StringLike): number {
    const parsed = typeof value === 'bigint' ? Number(value) : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Invalid identifier received',
      });
    }
    return parsed;
  }

  private async validatePayload<T>(
    cls: ClassConstructor<T>,
    payload: Partial<T>,
  ): Promise<T> {
    const dto = plainToInstance(cls, payload, {
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });
    const errors = await validate(dto as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false },
    });

    if (errors.length) {
      const fieldErrors = flattenValidationErrors(errors);
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Validation failed',
        details: JSON.stringify({ fieldErrors }),
      });
    }

    return dto;
  }
}
