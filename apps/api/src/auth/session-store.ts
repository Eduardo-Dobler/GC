import { randomUUID } from 'node:crypto';

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly ttl = EIGHT_HOURS,
  ) {}

  create(userId: string): string {
    const token = randomUUID();
    this.sessions.set(token, { token, userId, expiresAt: this.now() + this.ttl });
    return token;
  }

  get(token: string): Session | undefined {
    const session = this.sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    return session;
  }

  delete(token: string): void {
    this.sessions.delete(token);
  }

  deleteUser(userId: string): void {
    for (const [token, session] of this.sessions) {
      if (session.userId === userId) this.sessions.delete(token);
    }
  }

  clear(): void {
    this.sessions.clear();
  }
}
