export interface TokenPair {
  accessToken: null | string;
  refreshToken: null | string;
}

interface SessionOptions<T extends TokenPair> {
  apply: (tokens: T) => void;
  current: () => TokenPair;
  expire: () => Promise<void>;
  refresh: (refreshToken: string) => Promise<T>;
  runExclusive?: <T>(callback: () => Promise<T>) => Promise<T>;
  wait?: () => Promise<void>;
}

export function responseStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

/** One rotation per client; transient failures preserve the existing credentials. */
export function createSessionRefresher<T extends TokenPair>(
  options: SessionOptions<T>,
) {
  let pending: null | Promise<string> = null;
  const wait =
    options.wait ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 1000)));

  async function rotate(): Promise<string> {
    const before = options.current();
    if (!before.refreshToken) {
      await options.expire();
      throw new Error('登录已过期，请重新登录');
    }
    try {
      let next: T;
      try {
        next = await options.refresh(before.refreshToken);
      } catch (error) {
        if (
          responseStatus(error) !== undefined &&
          responseStatus(error) !== 503
        )
          throw error;
        await wait();
        if (options.current().refreshToken !== before.refreshToken) throw error;
        next = await options.refresh(before.refreshToken);
      }
      if (options.current().refreshToken !== before.refreshToken) {
        throw new Error('登录状态已改变，请重新操作');
      }
      if (!next.accessToken || !next.refreshToken)
        throw new Error('登录已失效，请重新登录');
      options.apply(next);
      return next.accessToken;
    } catch (error) {
      if (
        responseStatus(error) === 401 &&
        options.current().refreshToken === before.refreshToken
      ) {
        await options.expire();
      }
      throw error;
    }
  }

  return (failedAccessToken: null | string): Promise<string> => {
    if (!pending) {
      const run = options.runExclusive ?? ((callback) => callback());
      pending = run(async () => {
        // A late 401 (or another tab's rotation) must reuse the newer pair.
        const current = options.current();
        if (current.accessToken && current.accessToken !== failedAccessToken)
          return current.accessToken;
        return rotate();
      }).finally(() => {
        pending = null;
      });
    }
    return pending;
  };
}
