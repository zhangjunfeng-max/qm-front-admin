import { createApp, h } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ActivityRegister from '../../views/management/activity-register.vue';

const api = vi.hoisted(() => ({
  readInvitation: vi.fn(),
  registerForActivity: vi.fn(),
  push: vi.fn(),
}));

vi.mock('#/api/management', () => ({
  readInvitation: api.readInvitation,
  registerForActivity: api.registerForActivity,
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { token: 'employee-invitation' } }),
  useRouter: () => ({ push: api.push }),
}));

let cleanup: (() => void) | undefined;

beforeEach(() => {
  api.readInvitation.mockReset().mockResolvedValue({
    tenantName: '测试公司',
    activityName: '摄影活动',
    groups: [],
  });
  api.registerForActivity
    .mockReset()
    .mockResolvedValue({ message: '申请已提交' });
  api.push.mockReset();
});

afterEach(() => {
  cleanup?.();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mountForm() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ render: () => h(ActivityRegister) });
  app.mount(root);
  cleanup = () => app.unmount();
  await vi.waitFor(() => expect(document.querySelector('form')).not.toBeNull());
  const inputs = document.querySelectorAll<HTMLInputElement>('input');
  for (const [index, value] of [
    '员工甲',
    '13800138000',
    '12345678',
  ].entries()) {
    inputs[index]!.value = value;
    inputs[index]!.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await Promise.resolve();
}

function submit() {
  document
    .querySelector('form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

it('submits the employee form through the real Ant Design form and shows approval pending', async () => {
  await mountForm();
  submit();
  await vi.waitFor(() =>
    expect(api.registerForActivity).toHaveBeenCalledOnce(),
  );
  expect(api.registerForActivity).toHaveBeenCalledWith({
    token: 'employee-invitation',
    displayName: '员工甲',
    phone: '13800138000',
    password: '12345678',
    role: 'member',
    groupId: null,
  });
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('申请已提交'),
  );
  expect(document.body.textContent).toContain('请等待管理员审核');
});

it('shows a rejected application error and allows a corrected retry', async () => {
  api.registerForActivity.mockRejectedValueOnce(
    new Error('账号已存在，请输入该账号的正确密码'),
  );
  await mountForm();
  submit();
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain(
      '账号已存在，请输入该账号的正确密码',
    ),
  );
  expect(document.querySelector('form')).not.toBeNull();
  submit();
  await vi.waitFor(() =>
    expect(api.registerForActivity).toHaveBeenCalledTimes(2),
  );
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('申请已提交'),
  );
});

it('does not send repeated applications while the first request is pending', async () => {
  let resolve!: (value: { message: string }) => void;
  api.registerForActivity.mockImplementation(
    () =>
      new Promise((finish) => {
        resolve = finish;
      }),
  );
  await mountForm();
  submit();
  await vi.waitFor(() =>
    expect(api.registerForActivity).toHaveBeenCalledOnce(),
  );
  submit();
  await new Promise((finish) => setTimeout(finish, 20));
  expect(api.registerForActivity).toHaveBeenCalledOnce();
  resolve({ message: '申请已提交' });
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('申请已提交'),
  );
});

it('uses a phone keypad and preserves a mobile-friendly invitation form', async () => {
  await mountForm();
  const phone = document.querySelector<HTMLInputElement>('input[type="tel"]');
  expect(phone?.inputMode).toBe('numeric');
  expect(phone?.maxLength).toBe(11);
  expect(document.querySelector('main.invitation-page')).not.toBeNull();
  expect(
    document.querySelector('button[type="submit"]')?.textContent,
  ).toContain('确认并提交申请');
});
