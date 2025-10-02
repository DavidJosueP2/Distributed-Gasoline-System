import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { ensureUserStatus } from '../../domain/value-objects/user-status.vo';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserMapper } from '../mappers/user.mapper';
import { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class UsersApplicationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  async getUserById(id: number): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return UserMapper.toResponse(user);
  }

async getAllUsers(): Promise<UserResponseDto[]> {
  const users = await this.repository.findAll();
  console.log('Users fetched in application service:', users); // <-- log de depuración
  return UserMapper.toList(users);
}


  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await hash(dto.password, 10);
    const user = await this.repository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      username: dto.username,
      passwordHash,
      status: ensureUserStatus(dto.status),
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
}
