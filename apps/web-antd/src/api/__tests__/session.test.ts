import { describe, expect, it, vi } from 'vitest';

import { createSessionRefresher } from '../session';

function setup(
  refresh = vi.fn().mockResolvedValue({
    accessToken: 'next-access',
    refreshToken: 'next-refresh',
  }),
) {
  let tokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
  const apply = vi.fn((pair) => {
    tokens = pair;
  });
  const expire = vi.fn(async () => {
    tokens = { accessToken: '', refreshToken: '' };
  });
  const rotate = createSessionRefresher({
    apply,
    current: () => tokens,
    expire,
    refresh,
    wait: async () => {},
  });
  return { apply, current: () => tokens, expire, refresh, rotate };
}

describe('backend session rotation', () => {
  it('shares one refresh across concurrent 401s and atomically replaces both tokens', async () => {
    const session = setup();
    await Promise.all(
      Array.from({ length: 8 }, () => session.rotate('old-access')),
    );
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(session.refresh).toHaveBeenCalledWith('old-refresh');
    expect(session.current()).toEqual({
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });
    await session.rotate('old-access');
    expect(session.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps credentials on repeated 503s, and permits a later retry', async () => {
    const error = { response: { status: 503 } };
    const session = setup(vi.fn().mockRejectedValue(error));
    await expect(session.rotate('old-access')).rejects.toBe(error);
    expect(session.expire).not.toHaveBeenCalled();
    expect(session.current().refreshToken).toBe('old-refresh');
    session.refresh.mockResolvedValue({
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });
    await expect(session.rotate('old-access')).resolves.toBe('next-access');
  });

  it('retries a lost response using the same refresh token', async () => {
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue({
        accessToken: 'next-access',
        refreshToken: 'next-refresh',
      });
    const session = setup(refresh);
    await session.rotate('old-access');
    expect(refresh.mock.calls).toEqual([['old-refresh'], ['old-refresh']]);
  });

  it('expires once on an invalid refresh token without retry loops', async () => {
    const session = setup(
      vi.fn().mockRejectedValue({ response: { status: 401 } }),
    );
    await Promise.allSettled([
      session.rotate('old-access'),
      session.rotate('old-access'),
    ]);
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(session.expire).toHaveBeenCalledTimes(1);
  });

  it('does not restore credentials if logout happens during refresh', async () => {
    let complete!: (value: {
      accessToken: string;
      refreshToken: string;
    }) => void;
    const session = setup(
      vi.fn(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      ),
    );
    const request = session.rotate('old-access');
    await session.expire();
    complete({ accessToken: 'next-access', refreshToken: 'next-refresh' });
    await expect(request).rejects.toThrow('登录状态已改变');
    expect(session.apply).not.toHaveBeenCalled();
  });
});
