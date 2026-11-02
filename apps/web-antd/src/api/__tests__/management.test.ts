import { Buffer } from 'node:buffer';
import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerForActivity } from '../management';
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('#/api/request', () => ({
  authRequestClient: { get, post },
  requestClient: {},
}));
beforeEach(() => {
  get.mockReset();
  post.mockReset();
});
describe('activity employee registration', () => {
  it('encrypts the account password and requests only pending role approval', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const key = {
      algorithm: 'RSA-OAEP-256',
      challenge: 'a'.repeat(48),
      keyId: 'b'.repeat(32),
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      expiresIn: 120,
    };
    get.mockResolvedValue(key);
    post.mockResolvedValue({ message: 'ok' });
    await registerForActivity({
      token: 'invite-token',
      phone: ' 13800138000 ',
      displayName: '员工甲',
      password: 'Password123!',
      role: 'admin',
      groupId: null,
    });
    const [url, payload] = post.mock.calls[0]!;
    expect(url).toBe('/auth/activity-register');
    expect(payload).toMatchObject({
      token: 'invite-token',
      phone: '13800138000',
      displayName: '员工甲',
      role: 'admin',
      groupId: null,
      keyId: key.keyId,
      challenge: key.challenge,
    });
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('status');
    expect(
      privateDecrypt(
        {
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
        },
        Buffer.from(payload.encryptedPassword, 'base64'),
      ).toString(),
    ).toBe('Password123!');
  });
});
