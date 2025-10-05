export interface IdempotencyKeyRepository {
    /**
     * Marks a key as used and returns true if it was the first time,
     * false if it was already used (idempotence).
     */
    useOnce(
        key: string,
        resourceType: string,
        resourceId: bigint
    ): Promise<boolean>;
}