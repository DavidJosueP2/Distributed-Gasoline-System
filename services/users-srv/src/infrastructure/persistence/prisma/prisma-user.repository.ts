import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateUserInput,
  UpdateUserInput,
  USER_REPOSITORY,
  UserRepository,
} from '../../../domain/repositories/user.repository';
import { PrismaUserMapper } from './prisma-user.mapper';
import { User } from '../../../domain/entities/user.entity';

const INCLUDE_ROLES = {
  userRoles: { include: { role: true } },
};

function toBigInt(id: number): bigint {
  return BigInt(id);
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  private readonly logger = new Logger(PrismaUserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: toBigInt(id) },
      include: INCLUDE_ROLES,
    });
    if (!record) return null;
    return PrismaUserMapper.toDomain(record as any);
  }

 async findAll(): Promise<User[]> {
  const records = await this.prisma.user.findMany({
    include: INCLUDE_ROLES,
    orderBy: { createdAt: 'desc' },
  });

  console.log('Registros desde la base de datos:', records); // <-- log agregado

  const users = records.map((record) => PrismaUserMapper.toDomain(record as any));

  console.log('Usuarios después de mapear a dominio:', users); // <-- log de mapeo

  return users;
}
  async create(input: CreateUserInput): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        username: input.username,
        passwordHash: input.passwordHash,
        status: input.status ?? 'ACTIVE',
        userRoles: input.roleIds?.length
          ? {
              create: input.roleIds.map((roleId) => ({
                role: { connect: { id: toBigInt(roleId) } },
              })),
            }
          : undefined,
      },
      include: INCLUDE_ROLES,
    });

    return PrismaUserMapper.toDomain(record as any);
  }

  async update(id: number, input: UpdateUserInput): Promise<User> {
    const userId = toBigInt(id);

    const record = await this.prisma.$transaction(async (tx) => {
      if (input.roleIds) {
        await tx.userRole.deleteMany({ where: { userId } });
        if (input.roleIds.length) {
          await tx.userRole.createMany({
            data: input.roleIds.map((roleId) => ({
              userId,
              roleId: toBigInt(roleId),
            })),
          });
        }
      }

      const data: Record<string, unknown> = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        username: input.username,
        passwordHash: input.passwordHash,
        status: input.status,
      };

      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      return tx.user.update({
        where: { id: userId },
        data,
        include: INCLUDE_ROLES,
      });
    });

    return PrismaUserMapper.toDomain(record as any);
  }

  async delete(id: number): Promise<void> {
    const userId = toBigInt(id);
    await this.prisma.user.delete({ where: { id: userId } });
  }
}

export const PrismaUserRepositoryProvider = {
  provide: USER_REPOSITORY,
  useClass: PrismaUserRepository,
};
