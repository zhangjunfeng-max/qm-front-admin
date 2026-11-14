/* eslint-disable vue/one-component-per-file -- Tests mount independent components. */
import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, expect, it } from 'vitest';

import Fields from '../../components/management/activity-form-fields.vue';
import Changes from '../../components/management/notification-changes.vue';
import { defaultActivity } from '../activity-form';

let cleanup: (() => void) | undefined;
afterEach(() => { cleanup?.(); document.body.innerHTML = ''; });

it('locks every form field and reordering control after approval', async () => {
  const fields = ref([...defaultActivity().formConfig.fields, { key: 'extra', type: 'text' as const, label: '其他', placeholder: '', required: false }]);
  const disabled = ref(true);
  const root = document.createElement('div'); document.body.append(root);
  const app = createApp({ render: () => h(Fields, { modelValue: fields.value, disabled: disabled.value }) });
  app.mount(root); cleanup = () => app.unmount();
  expect([...root.querySelectorAll('input,button')].every(item => (item as HTMLButtonElement).disabled)).toBe(true);
  expect(root.querySelector('[draggable="true"]')).toBeNull();
  const add = [...root.querySelectorAll('button')].find(item => item.textContent?.includes('添加字段'))!;
  add.click(); await nextTick(); expect(fields.value).toHaveLength(3);
  disabled.value = false; await nextTick();
  add.click(); await nextTick(); expect(fields.value).toHaveLength(4);
});

it('displays complete before/after content safely as text', () => {
  const root = document.createElement('div'); document.body.append(root);
  const text = '<img src=x onerror=alert(1)>' + '活动规则'.repeat(600);
  const app = createApp({ render: () => h(Changes, { changes: [{ field: 'rulesText', label: '活动规则', before: '原规则', after: text }] }) });
  app.mount(root); cleanup = () => app.unmount();
  expect(root.textContent).toContain(text);
  expect(root.textContent).toContain('修改前原规则');
  expect(root.querySelector('img')).toBeNull();
});
