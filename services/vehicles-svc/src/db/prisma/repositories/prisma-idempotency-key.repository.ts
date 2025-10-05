import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IdempotencyKeyRepository } from '../../../domain/repositories/idempotency-key.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaIdempotencyKeyRepository implements IdempotencyKeyRepository {
    constructor(private readonly prisma: PrismaService) {}

    async useOnce(key: string, resourceType: string, resourceId: bigint): Promise<boolean> {
        try {
            await this.prisma.idempotencyKey.create({
                data: { key, resourceType, resourceId },
            });
            return true; // primera vez
        } catch (e: any) {
            if (this.isUniqueViolation(e)) return false; // ya existía
            throw e;
        }
    }

    private isUniqueViolation(e: any): boolean {
        return !!e && typeof e.code === 'string' && e.code === 'P2002';
    }
}
