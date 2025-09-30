import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  //controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
