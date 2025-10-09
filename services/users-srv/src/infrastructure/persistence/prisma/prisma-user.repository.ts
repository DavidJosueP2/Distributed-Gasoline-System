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



  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: {
        email,
        deletedAt: null,
      },
      include: INCLUDE_ROLES,
    });
    if (!record) return null;
    return PrismaUserMapper.toDomain(record as any);
  }

  async findByPhone(phone: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: {
        phone,
        deletedAt: null,
      },
      include: INCLUDE_ROLES,
    });
    if (!record) return null;
    return PrismaUserMapper.toDomain(record as any);
  }

  async findByUserName(username: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: {
        username,
        deletedAt: null,
      },
      include: INCLUDE_ROLES,
    });
    if (!record) return null;
    return PrismaUserMapper.toDomain(record as any);
  }


  async findByEmailExceptSelf(email: string, userId: number): Promise<User | null> {
  const record = await this.prisma.user.findFirst({
    where: {
      email,
      deletedAt: null,
      NOT: {
        id: toBigInt(userId), 
      },
    },
    include: INCLUDE_ROLES,
  });

  if (!record) return null;
  return PrismaUserMapper.toDomain(record as any);
}


  async findByPhoneExceptSelf(phone: string, userId: number): Promise<User | null> {
  const record = await this.prisma.user.findFirst({
    where: {
      phone,
      deletedAt: null,
      NOT: {
        id: toBigInt(userId), 
      },
    },
    include: INCLUDE_ROLES,
  });
  if (!record) return null;
  return PrismaUserMapper.toDomain(record as any);
}

async findByUserNameExceptSelf(username: string, userId: number): Promise<User | null> {
  const record = await this.prisma.user.findFirst({
    where: {
      username,
      deletedAt: null,
      NOT: {
        id: toBigInt(userId), 
      },
    },
    include: INCLUDE_ROLES,
  });
  if (!record) return null;
  return PrismaUserMapper.toDomain(record as any);
}



  async findById(id: number): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: toBigInt(id),
        deletedAt: null
      },
      include: INCLUDE_ROLES,
    });
    if (!record) return null;
    return PrismaUserMapper.toDomain(record as any);
  }

 async findAll(): Promise<User[]> {
  const records = await this.prisma.user.findMany({
    where: {
      deletedAt: null
    },
    include: INCLUDE_ROLES,
    orderBy: { createdAt: 'desc' },
  });


  const users = records.map((record) => PrismaUserMapper.toDomain(record as any));


  return users;
}
  async create(input: CreateUserInput): Promise<User> {
    const record = await this.prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          username: input.username,
          passwordHash: input.passwordHash,
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
        where: { id: userId,
          deletedAt: null
        },
        data,
        include: INCLUDE_ROLES,
      });
    });

    return PrismaUserMapper.toDomain(record as any);
  }

  async delete(id: number): Promise<void> {
    const userId = toBigInt(id);
    await this.prisma.user.update({
      where:{id:userId},
      data:{
        deletedAt:new Date(),
        status:'INACTIVE'
      }
    })
  }

    async undelete(id: number): Promise<void> {
      const userId = toBigInt(id);
    await this.prisma.user.update({
      where:{id:userId},
      data:{
        deletedAt:null,
        status:'ACTIVE'
      }
    })
  }

   async updatePassword(id: number, newPasswordHash: string): Promise<void> {
   const record = await this.prisma.user.findUnique({
      where: { id: toBigInt(id)
      }
    });

    await this.prisma.user.update({
      where: { id: toBigInt(id) },
      data: { passwordHash: newPasswordHash },
    });

  
  }
  
}

export const PrismaUserRepositoryProvider = {
  provide: USER_REPOSITORY,
  useClass: PrismaUserRepository,
};
