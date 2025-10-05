import { User } from '../entities/user.entity';
import { UserStatus } from '../value-objects/user-status.vo';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  passwordHash: string;
  roleIds: number[];
}

export interface UpdateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  passwordHash: string;
  status: UserStatus;
  roleIds?: number[];
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByUserName(username: string): Promise<User | null>;
  findByEmailExceptSelf(email: string, userId: number): Promise<User | null>;
  findByPhoneExceptSelf(phone: string, userId: number): Promise<User | null>;
  findByUserNameExceptSelf(username: string, userId: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  update(id: number, input: UpdateUserInput): Promise<User>;
  updatePassword(id: number, newPasswordHash: string): Promise<void>;
  delete(id: number): Promise<void>;
  undelete(id: number): Promise<void>;
}
