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
import { InvalidIdentifierException } from 'src/application/exceptions/invalid_id.exception';
import { UpdatePasswordRequest } from 'src/application/dto/request/update-password-request';
import { Public, Roles } from 'src/common/auth';
import { UpdateFullNameUserDto } from 'src/application/dto/request/update-full-name-request';

type StringLike = string | number | bigint | undefined | null;

@Controller()
export class UsersGrpcController {
  constructor(private readonly service: UsersApplicationService) { }

  private coerceId(value: StringLike): number {
    const parsed = typeof value === 'bigint' ? Number(value) : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new InvalidIdentifierException();
    }
    return parsed;
  }


  @Public()
  @GrpcMethod('UserService', 'GetUser')
  async getUser(data: { userId: StringLike }) {
    const id = this.coerceId(data.userId);
    const user = await this.service.getUserById(id);
    return UserMapper.toGrpc(user);
  }

 

  @Public()
  @GrpcMethod('UserService', 'GetUserByEmail')
  async getUserByEmail(data: FindUserByEmailRequest) {
    const user = await this.service.getUserByEmail(data);
    return UserMapper.toGrpcByEmail(user);
  }

  @Roles('ADMIN')
  @GrpcMethod('UserService', 'GetAllUsers')
  async getAll() {

    const users = await this.service.getAllUsers();
    const grpcResult = UserMapper.toGrpcList(users);

    return grpcResult;
  }

  @Public()
  @GrpcMethod('UserService', 'CreateUser')
  async create(data: CreateUserDto) {
    const user = await this.service.createUser(data);
    return UserMapper.toGrpc(user);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'DRIVER')
  @GrpcMethod('UserService', 'UpdateUser')
  async update(data: UpdateUserDto) {
    const user = await this.service.updateUser(data);
    return UserMapper.toGrpc(user);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'DRIVER')
  @GrpcMethod('UserService', 'UpdateFullName')
  async updateFullName(data: UpdateFullNameUserDto) {
    const user = await this.service.updateFullNameUser(data);
    return UserMapper.toGrpc(user);
  }


  @Public()
  @GrpcMethod('UserService', 'UpdatePassword')
  async updatePassword(data: UpdatePasswordRequest) {
    const result = await this.service.updatePassword(data);
    return result;
  }

  @Roles('ADMIN')
  @GrpcMethod('UserService', 'DeleteUser')
  async delete(data: { userId: StringLike }) {
    const userId = this.coerceId(data.userId);
    const result = await this.service.deleteUser(userId);
    return result;
  }

  @Roles('ADMIN')
  @GrpcMethod('UserService', 'UnDeleteUser')
  async undelete(data: { userId: StringLike }) {
    const userId = this.coerceId(data.userId);
    const result = await this.service.undeleteUser(userId);
    return result;
  }

  @Roles('ADMIN')
  @GrpcMethod('UserService', 'GetAllInactiveUsers')
  async getAllInactiveUsers() {
    const users = await this.service.getAllInactiveUsers();
    const grpcResult = UserMapper.toGrpcList(users);
    return grpcResult;
  }
}
