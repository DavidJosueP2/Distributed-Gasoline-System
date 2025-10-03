import { Inject, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { ensureUserStatus, UserStatus } from '../../domain/value-objects/user-status.vo';

import { UserMapper } from '../mappers/user.mapper';
import { FindUserByEmailRequest } from '../dto/request/find-user-by-email-reques';
import FindUserByEmailResponse from '../dto/response/find-user-by-email-response';
import { UserResponseDto } from '../dto/response/user-response';
import { CreateUserDto } from '../dto/request/create-user-request';
import { UpdateUserDto } from '../dto/request/update-user-request';
import { NotFoundException } from '../exceptions/not-found.exception';
import { NotUserActive } from '../exceptions/not-active-user.exception';
import { User } from 'generated/prisma';
import { DataAlreadyExistsException } from '../exceptions/data-already-exists.exception';

@Injectable()
export class UsersApplicationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}


  async getUserByEmail(request: FindUserByEmailRequest): Promise<FindUserByEmailResponse> {
    const user = await this.repository.findByEmail(request.email);
    if(!user) throw new NotFoundException('Usuario no encontrado');
    this.ensureActive(user.status);
    return UserMapper.toFindByEmailResponse(user);
  }

  async getUserById(id: number): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);
     if(!user) throw new NotFoundException('Usuario no encontrado');
    this.ensureActive(user.status);
    return UserMapper.toResponse(user);
  }

async getAllUsers(): Promise<UserResponseDto[]> {
  const users = await this.repository.findAll();
  return UserMapper.toList(users);
}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {

if(await this.repository.findByEmail(dto.email)) {
  throw new DataAlreadyExistsException('El correo electrónico ya está en uso');
}
    const passwordHash = await hash(dto.password, 10);
    const user = await this.repository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      username: dto.username,
      passwordHash,
      roleIds: dto.roleIds,
    });
    return UserMapper.toResponse(user);
  }

  async updateUser(dto: UpdateUserDto): Promise<UserResponseDto> {
    const existing = await this.repository.findById(dto.userId);
    if (!existing) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const passwordHash = dto.password ? await hash(dto.password, 10) : undefined;

    const updated = await this.repository.update(existing.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      username: dto.username,
      passwordHash,
      status: dto.status ? ensureUserStatus(dto.status) : undefined,
      roleIds: dto.roleIds,
    });

    return UserMapper.toResponse(updated);
  }

  async deleteUser(id: number): Promise<{ success: boolean }> {
    await this.repository.delete(id);
    return { success: true };
  }


  private ensureActive(status?: string | UserStatus): void {
  const normalized = ensureUserStatus(status as string);
  if (normalized !== 'ACTIVE') throw new NotUserActive('El usuario no esta activo o bloqueado');
}
}
