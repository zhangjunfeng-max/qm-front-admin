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
it('adds the activity management menu authority only after the current company allows it', async () => {
  mock.access.mockResolvedValue({ canManageOrders: true });
  await generateAccess({ roles: ['member'], router: {} as never, routes: [] });
  expect(mock.generate).toHaveBeenLastCalledWith(
    'frontend',
    expect.objectContaining({ roles: ['member', 'activity_manager'] }),
  );
  mock.access.mockResolvedValue({ canManageOrders: false });
  await generateAccess({ roles: ['member'], router: {} as never, routes: [] });
  expect(mock.generate).toHaveBeenLastCalledWith(
    'frontend',
    expect.objectContaining({ roles: ['member'] }),
  );
});
it('cannot install permissions returned after switching companies', async () => {
  const controller = new AbortController();
  mock.access.mockImplementation(async () => {
    controller.abort();
    return { canManageOrders: true };
  });
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
it('uses company administrator and platform roles without employee permission lookups', async () => {
  for (const roles of [['admin'], ['owner'], ['platform_admin']]) {
    await generateAccess({ roles, router: {} as never, routes: [] });
    expect(mock.generate).toHaveBeenLastCalledWith(
      'frontend',
      expect.objectContaining({ roles }),
    );
  }
  expect(mock.access).not.toHaveBeenCalled();
});
