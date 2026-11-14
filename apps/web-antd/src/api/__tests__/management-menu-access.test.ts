import { beforeEach, expect, it, vi } from 'vitest';

import { generateAccess } from '../../router/access';
const mock = vi.hoisted(() => ({ access: vi.fn(), generate: vi.fn() }));
vi.mock('#/api/customer-management', () => ({
  getCustomerManagementAccess: mock.access,
}));
vi.mock('@vben/access', () => ({ generateAccessible: mock.generate }));
beforeEach(() => {
  mock.access.mockReset();
  mock.generate.mockReset().mockResolvedValue({});
});
it('uses verified company and platform roles without activity role augmentation', async () => {
  for (const roles of [
    ['member'],
    ['admin'],
    ['platform_admin'],
    ['admin', 'platform_admin'],
  ]) {
    await generateAccess({ roles, router: {} as never, routes: [] });
    expect(mock.generate).toHaveBeenLastCalledWith(
      'frontend',
      expect.objectContaining({ roles }),
    );
  }
  expect(mock.access).not.toHaveBeenCalled();
});
it('cannot generate menus for an already cancelled company context', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    generateAccess({
      roles: ['member'],
      router: {} as never,
      routes: [],
      signal: controller.signal,
    }),
  ).rejects.toThrow();
  expect(mock.generate).not.toHaveBeenCalled();
});
