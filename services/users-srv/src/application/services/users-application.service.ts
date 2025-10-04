import { Inject, Injectable } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import {
  ensureUserStatus,
  UserStatus,
} from '../../domain/value-objects/user-status.vo';

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
import { UpdatePasswordRequest } from '../dto/request/update-password-request';

@Injectable()
export class UsersApplicationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  async getUserByEmail(
    request: FindUserByEmailRequest,
  ): Promise<FindUserByEmailResponse> {
    const user = await this.repository.findByEmail(request.email);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    this.ensureActive(user.status);
    return UserMapper.toFindByEmailResponse(user);
  }

  async getUserById(id: number): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    this.ensureActive(user.status);
    return UserMapper.toResponse(user);
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.repository.findAll();
    return UserMapper.toList(users);
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    if (await this.repository.findByEmail(dto.email)) {
      throw new DataAlreadyExistsException(
        'El correo electrónico ya está en uso',
      );
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
      throw new NotFoundException(`Usuario no encontrado`);
    }
    this.ensureActive(existing.status);

    if (await this.repository.findByEmailExceptSelf(dto.email, dto.userId)) {
      throw new DataAlreadyExistsException(
        'El correo electrónico ya está en uso',
      );
    }
    if (await this.repository.findByPhoneExceptSelf(dto.phone, dto.userId)) {
      throw new DataAlreadyExistsException(
        'El número de teléfono ya está en uso',
      );
    }

    const passwordHash = dto.password
      ? await hash(dto.password, 10)
      : undefined;

    const updated = await this.repository.update(existing.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      username: dto.username,
      passwordHash,
      status: dto.status ? ensureUserStatus(dto.status) : existing.status,
      roleIds: dto.roleIds,
    });

    return UserMapper.toResponse(updated);
  }

  async deleteUser(id: number): Promise<{ success: boolean }> {
    await this.repository.delete(id);
    return { success: true };
  }
  async undeleteUser(id: number): Promise<{ success: boolean }> {
    await this.repository.undelete(id);
    return { success: true };
  }

  async updatePassword(
    request: UpdatePasswordRequest,
  ): Promise<{ success: boolean }> {
    const row = await this.repository.findById(request.userId);
    if (!row) {
      throw new NotFoundException(`Usuario no encontrado`);
    }

    this.ensureActive(row.status);

    const isSamePassword = await compare(request.newPassword, row.passwordHash);

    if (isSamePassword) {
      throw new DataAlreadyExistsException(
        'No se puede usar contraseñas antiguas',
      );
    }
    const newPasswordHash = await hash(request.newPassword, 10);
    await this.repository.updatePassword(row.id, newPasswordHash);

    return { success: true };
  }

  private ensureActive(status?: string | UserStatus): void {
    const normalized = ensureUserStatus(status as string);
    if (normalized !== 'ACTIVE')
      throw new NotUserActive(
        'Su cuenta se encuentra bloqueada por favor contacte al administrador',
      );
  }
}
