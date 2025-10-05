import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersApplicationService } from '../application/services/users-application.service';
import { PrismaUserRepositoryProvider } from '../infrastructure/persistence/prisma/prisma-user.repository';
import { UsersGrpcController } from '../presentation/grpc/users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UsersGrpcController],
  providers: [UsersApplicationService, PrismaUserRepositoryProvider],
})
export class UsersModule {}
