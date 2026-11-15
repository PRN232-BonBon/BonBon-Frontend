import type { AuthSession } from "./auth-api";

export function sameSession(left: AuthSession | null, right: AuthSession | null) {
  return left?.account.accountId === right?.account.accountId
    && left?.refreshToken === right?.refreshToken;
}

interface RefreshDependencies {
  read: () => AuthSession | null;
  write: (session: AuthSession | null) => void;
  request: (refreshToken: string) => Promise<AuthSession>;
  withLock: (action: () => Promise<AuthSession | null>) => Promise<AuthSession | null>;
}

// Persist the replacement before releasing the cross-tab lock. Another tab must
// see the new token before deciding whether its old token still needs refreshing.
export function createSessionRefresh({ read, write, request, withLock }: RefreshDependencies) {
  const pending = new Map<string, Promise<AuthSession | null>>();
  return (current: AuthSession): Promise<AuthSession | null> => {
    const key = `${current.account.accountId}:${current.refreshToken}`;
    const existing = pending.get(key);
    if (existing) return existing;

    const operation = withLock(async () => {
      const stored = read();
      if (!sameSession(stored, current)) return stored;
      try {
        const next = await request(current.refreshToken);
        // Logout or a new login may have happened while the request was running.
        if (!sameSession(read(), current)) return read();
        write(next);
        return next;
      } catch (error) {
        if (!sameSession(read(), current)) return read();
        const status = (error as { status?: number } | null)?.status;
        if (status === 401 || status === 403) write(null);
        throw error;
      }
    }).finally(() => { if (pending.get(key) === operation) pending.delete(key); });
    pending.set(key, operation);
    return operation;
  };
}
