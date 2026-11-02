import { describe, expect, it } from 'vitest';

import { sessionContext } from '../company-context';

describe('company context', () => {
  it('keeps platform-only sessions out of company business menus', () => {
    const context = sessionContext(
      { role: 'platform_admin', isPlatformAdmin: true },
      { id: '00000000-0000-0000-0000-000000000000', name: '' },
    );
    expect(context.currentTenant).toBeNull();
    expect(context.roles).toEqual(['platform_admin']);
    expect(context.homePath).toBe('/platform/overview');
  });
  it('uses the selected company and its business role without expanding ordinary privileges', () => {
    const tenant = { id: 'company-b', name: 'B公司' };
    expect(
      sessionContext({ role: 'admin', isPlatformAdmin: true }, tenant),
    ).toEqual({
      currentTenant: tenant,
      homePath: '/home',
      roles: ['admin'],
    });
    expect(
      sessionContext({ role: 'member', isPlatformAdmin: false }, tenant).roles,
    ).toEqual(['member']);
  });
});
