import { Buffer } from 'node:buffer';
import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loginApi, logoutApi, refreshTokenApi } from '../core/auth';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('#/api/request', () => ({ authRequestClient: { get, post } }));

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('go authentication HTTP contract', () => {
  it('fetches a public key and submits only a phone and randomized encrypted password', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const key = {
      algorithm: 'RSA-OAEP-256',
      challenge: 'a'.repeat(48),
      expiresIn: 120,
      keyId: 'b'.repeat(32),
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    };
    const credentials = {
      phone: ' 13800138000 ',
      password: 'Password123!中文',
    };
    const pair = { accessToken: 'access', refreshToken: 'refresh' };
    get.mockResolvedValue(key);
    post.mockResolvedValue(pair);
    await expect(loginApi(credentials)).resolves.toBe(pair);
    await loginApi(credentials);
    expect(get).toHaveBeenNthCalledWith(1, '/auth/public-key');
    expect(get).toHaveBeenCalledTimes(2);
    const payload = post.mock.calls[0]![1];
    expect(payload).toEqual({
      phone: '13800138000',
      encryptedPassword: expect.any(String),
      keyId: key.keyId,
      challenge: key.challenge,
    });
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('email');
    expect(post.mock.calls[1]![1].encryptedPassword).not.toBe(
      payload.encryptedPassword,
    );
    const options = {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
      oaepLabel: Buffer.from(
        JSON.stringify([
          'group-biz/login/v2',
          key.keyId,
          key.challenge,
          '13800138000',
        ]),
      ),
    };
    const encrypted = Buffer.from(payload.encryptedPassword, 'base64');
    expect(privateDecrypt(options, encrypted).toString('utf8')).toBe(
      credentials.password,
    );
    expect(() =>
      privateDecrypt(
        { ...options, oaepLabel: Buffer.from('tampered') },
        encrypted,
      ),
    ).toThrow();
  });

  it('does not submit credentials when the public key cannot be fetched', async () => {
    get.mockRejectedValue(new Error('unavailable'));
    await expect(
      loginApi({
        phone: '13800138000',
        password: 'Password123!',
      }),
    ).rejects.toThrow('unavailable');
    expect(post).not.toHaveBeenCalled();
  });

  it('sends refresh tokens as JSON instead of relying on mock cookies', async () => {
    post.mockResolvedValue({ accessToken: 'access', refreshToken: 'next' });
    await refreshTokenApi('refresh');
    expect(post).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'refresh',
    });
  });

  it('revokes the rotated pair when access expired before logout', async () => {
    post
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      })
      .mockResolvedValueOnce(undefined);
    await logoutApi('expired-access', 'old-refresh');
    expect(post.mock.calls).toEqual([
      [
        '/auth/logout',
        { refreshToken: 'old-refresh' },
        { headers: { Authorization: 'Bearer expired-access' } },
      ],
      ['/auth/refresh', { refreshToken: 'old-refresh' }],
      [
        '/auth/logout',
        { refreshToken: 'new-refresh' },
        { headers: { Authorization: 'Bearer new-access' } },
      ],
    ]);
  });

  it('does not attempt rotation on a transient logout outage', async () => {
    const error = { response: { status: 503 } };
    post.mockRejectedValue(error);
    await expect(logoutApi('access', 'refresh')).rejects.toBe(error);
    expect(post).toHaveBeenCalledTimes(1);
  });
});
