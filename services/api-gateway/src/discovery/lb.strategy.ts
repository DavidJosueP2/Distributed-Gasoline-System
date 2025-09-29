import { Injectable } from '@nestjs/common';

@Injectable()
export class RoundRobin {
    private readonly cursors = new Map<string, number>();

    pick<T>(key: string, list: readonly T[]): T | null {
        if (!list || list.length === 0) return null;
        const i = this.cursors.get(key) ?? 0;
        const item = list[i % list.length];
        this.cursors.set(key, (i + 1) % list.length);
        return item;
    }
}
