import { randomUUID } from 'crypto';

export class CorrelationId {
  static generate(): string {
    return randomUUID();
  }
}
