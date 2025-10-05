import {IdempotencyKey} from "../../../domain/entities/idempotency-key";

export class IdempotencyKeyPrismaMapper {
    static toDomain(row: any): IdempotencyKey {
        return {
            key: row.key,
            resourceType: row.resource_type,
            resourceId: BigInt(row.resource_id),
            createdAt: row.created_at ? new Date(row.created_at) : undefined,
        };
    }
}
