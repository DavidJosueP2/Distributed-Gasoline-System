// src/infra/discovery/rr.strategy.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoundRobin {
  private counters: Map<string, number> = new Map();

  pick(appName: string, instances: any[]): any {
    const currentCount = this.counters.get(appName) || 0;
    const selectedInstance = instances[currentCount % instances.length];
    this.counters.set(appName, currentCount + 1);
    return selectedInstance;
  }
}
