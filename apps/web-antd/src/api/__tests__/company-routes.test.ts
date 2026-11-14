import type { RouteRecordRaw } from 'vue-router';

import { createMemoryHistory, createRouter } from 'vue-router';

import { generateAccessible } from '@vben/access';
import { cloneDeep, resetStaticRoutes } from '@vben/utils';

import { describe, expect, it } from 'vitest';

import managementRoutes from '../../router/routes/modules/management';

describe('company permission switching', () => {
  it('keeps the customer menu visible and installs the hidden registration list', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [] });
    const routes = managementRoutes.filter((route) =>
      ['Registrations', 'CustomerManagement', 'ActivityOrders'].includes(
        String(route.name),
      ),
    );
    const result = await generateAccessible('frontend', {
      router,
      routes,
      roles: ['member'],
    });
    // 订单线与报名记录都不进菜单，但路由必须装好：订单功能保留，本期只隐藏入口。
    expect(result.accessibleMenus.map((menu) => menu.name)).toEqual([
      '客户管理',
    ]);
    expect(router.hasRoute('CustomerManagement')).toBe(true);
    expect(router.hasRoute('Registrations')).toBe(true);
    expect(router.hasRoute('ActivityOrders')).toBe(true);
    const ordinary = await generateAccessible('frontend', {
      router: createRouter({ history: createMemoryHistory(), routes: [] }),
      routes,
      roles: ['member'],
    });
    expect(ordinary.accessibleMenus.map((m) => m.name)).toEqual(['客户管理']);
  });
  it('removes old company routes after resetting and generating a lower role', async () => {
    const staticRoutes: RouteRecordRaw[] = [
      { name: 'Root', path: '/', component: {}, children: [] },
      { name: 'Login', path: '/login', component: {} },
    ];
    const router = createRouter({
      history: createMemoryHistory(),
      routes: cloneDeep(staticRoutes),
    });
    const routes: RouteRecordRaw[] = [
      {
        name: 'Activities',
        path: '/activities',
        component: {},
        meta: { authority: ['admin', 'member'], title: '活动管理' },
      },
      {
        name: 'Employees',
        path: '/employees',
        component: {},
        meta: { authority: ['admin'], title: '员工管理' },
      },
      {
        name: 'Users',
        path: '/platform/users',
        component: {},
        meta: { authority: ['platform_admin'], title: '用户管理' },
      },
    ];
    await generateAccessible('frontend', {
      router,
      routes,
      roles: ['admin', 'platform_admin'],
    });
    expect(router.hasRoute('Employees')).toBe(true);
    resetStaticRoutes(router, staticRoutes);
    const result = await generateAccessible('frontend', {
      router,
      routes,
      roles: ['member'],
    });
    expect(result.accessibleMenus.map((menu) => menu.name)).toEqual([
      '活动管理',
    ]);
    expect(router.hasRoute('Employees')).toBe(false);
    expect(router.hasRoute('Users')).toBe(false);
    expect(router.hasRoute('Activities')).toBe(true);
    expect(router.hasRoute('Login')).toBe(true);
    resetStaticRoutes(router, staticRoutes);
    const platform = await generateAccessible('frontend', {
      router,
      routes,
      roles: ['platform_admin'],
    });
    expect(platform.accessibleMenus.map((menu) => menu.name)).toEqual([
      '用户管理',
    ]);
    expect(router.hasRoute('Activities')).toBe(false);
    expect(router.hasRoute('Users')).toBe(true);
    expect(staticRoutes[0]?.children).toEqual([]);
  });
});

it('does not install routes when permission generation is cancelled by a company switch', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [] });
  const controller = new AbortController();
  const pending = generateAccessible('frontend', {
    router,
    routes: [
      {
        name: 'OldEmployees',
        path: '/employees',
        component: {},
        meta: { authority: ['admin'], title: '旧公司员工' },
      },
    ],
    roles: ['admin'],
    signal: controller.signal,
  });
  const rejected = expect(pending).rejects.toThrow();
  controller.abort(new Error('company switched'));
  await rejected;
  expect(router.hasRoute('OldEmployees')).toBe(false);
  expect(router.getRoutes()).toEqual([]);
});
