import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ActivityMembers from '../../views/management/activity-members.vue';

const { getOptions, batch } = vi.hoisted(() => ({
  getOptions: vi.fn(),
  batch: vi.fn(),
}));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { userId: 'owner', roles: ['owner'] } }),
}));
vi.mock('#/api/management', () => ({
  getEmployeeOptions: getOptions,
  batchActivityEmployees: batch,
  getActivityEmployees: async () => ({ items: [], total: 0 }),
  getActivityGroups: async () => ({ items: [] }),
  assignActivityEmployee: vi.fn(),
  reviewApplication: vi.fn(),
}));
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
});
beforeEach(() => {
  getOptions.mockReset();
  batch.mockReset();
});
function button(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    b.textContent?.replaceAll(/\s/g, '').includes(text),
  )!;
}
describe('activity bulk employee assignment', () => {
  it('preserves cross-page checkbox selection and submits one batch', async () => {
    const rows = Array.from({ length: 125 }, (_, i) => ({
      userId: String(i),
      displayName: `员工${i}`,
      phone: `1380000${i}`,
    }));
    let finish: ((value: unknown) => void) | undefined;
    getOptions.mockImplementation(async (_id, query) => {
      if (query.page === 2)
        return new Promise((resolve) => {
          finish = resolve;
        });
      return {
        items: rows.slice(
          (query.page - 1) * query.pageSize,
          query.page * query.pageSize,
        ),
        total: 125,
      };
    });
    batch.mockResolvedValue({ changed: 11, skipped: 0 });
    const app = createApp({
      setup: () => () =>
        h(ActivityMembers, {
          activity: {
            id: 'activity',
            canManageMembers: true,
            canReviewApplications: true,
            currentRole: 'admin',
          } as any,
        }),
    });
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    unmount = () => app.unmount();
    await vi.waitFor(() => expect(button('批量添加员工')).toBeDefined());
    button('批量添加员工').click();
    await vi.waitFor(() =>
      expect(
        document.querySelector(
          '.ant-modal-body .ant-table-tbody input[type=checkbox]',
        ),
      ).not.toBeNull(),
    );
    (
      document.querySelector(
        '.ant-modal-body .ant-table-tbody input[type=checkbox]',
      ) as HTMLInputElement
    ).click();
    await nextTick();
    (
      document.querySelector(
        '.ant-modal-body .ant-pagination-next button',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() => expect(finish).toBeDefined());
    expect(button('确认提交').disabled).toBe(true);
    expect(batch).not.toHaveBeenCalled();
    finish!({ items: rows.slice(10, 20), total: 125 });
    await vi.waitFor(() =>
      expect(
        document.querySelector('.ant-modal-body .ant-table-tbody')?.textContent,
      ).toContain('员工10'),
    );
    (
      document.querySelector(
        '.ant-modal-body .ant-table-tbody input[type=checkbox]',
      ) as HTMLInputElement
    ).click();
    await nextTick();
    expect(document.body.textContent).toContain('已选 2 人');
    (
      document.querySelector(
        '.ant-modal-body .ant-pagination-prev button',
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('.ant-modal-body .ant-table-tbody')?.textContent,
      ).toContain('员工0'),
    );
    expect(
      (
        document.querySelector(
          '.ant-modal-body .ant-table-tbody input[type=checkbox]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);
    (
      document.querySelector(
        '.ant-modal-body .ant-table-thead input[type=checkbox]',
      ) as HTMLInputElement
    ).click();
    await nextTick();
    expect(document.body.textContent).toContain('已选 11 人');
    expect(button('确认提交').disabled).toBe(false);
    button('确认提交').click();
    await vi.waitFor(() => expect(batch).toHaveBeenCalledTimes(1));
    expect(batch.mock.calls[0]![1].userIds).toHaveLength(11);
    expect(batch).toHaveBeenCalledWith('activity', {
      action: 'add',
      userIds: expect.arrayContaining(rows.slice(0, 11).map((r) => r.userId)),
      role: 'member',
      groupId: null,
    });
  });
});
