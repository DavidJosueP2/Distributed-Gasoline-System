// src/common/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokenExtractorService } from './token-extractor.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [TokenExtractorService],
  exports: [TokenExtractorService],
})
export class AuthModule {}

