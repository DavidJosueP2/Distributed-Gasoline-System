import { Injectable } from '@nestjs/common';

@Injectable()
export class RoundRobin {
  private cur = new Map<string, number>();
  pick<T>(key: string, list: readonly T[]): T | null {
    if (!list?.length) return null;
    const i = this.cur.get(key) ?? 0;
    const v = list[i % list.length];
    this.cur.set(key, (i + 1) % list.length);
    return v;
  }
}
