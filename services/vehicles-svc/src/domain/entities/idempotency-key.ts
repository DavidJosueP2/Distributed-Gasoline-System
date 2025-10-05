export interface IdempotencyKey {
    key: string;                // DB: idempotency_keys.key (citext)
    resourceType: string;       // DB: resource_type
    resourceId: bigint;         // DB: resource_id
    createdAt?: Date;
}