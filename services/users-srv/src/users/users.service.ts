// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';


@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.users.findMany({
      include: { user_roles: { include: { role: true } } }, 
    });
  }

  async getUserById(user_id: number) {
    return this.prisma.users.findUnique({
      where: { user_id },
      include: { user_roles: { include: { role: true } } },
    });
  }

  async createUser(data: any) {
    return this.prisma.users.create({
      data: {
        ...data,
      },
    });
  }

  async updateUser(user_id: number, data: any) {
    return this.prisma.users.update({
      where: { user_id },
      data,
    });
  }

  async deleteUser(user_id: number) {
    await this.prisma.users.delete({ where: { user_id } });
    return { success: true };
  }
}
