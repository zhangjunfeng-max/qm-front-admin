import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, expect, it } from 'vitest';

import RulesEditor from '../../components/management/activity-rules-editor.vue';

let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
});
function mount(value = '') {
  const content = ref(value);
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({
    render: () => h(RulesEditor, {
      modelValue: content.value,
      'onUpdate:modelValue': (value: string) => { content.value = value; },
    }),
  });
  app.mount(root);
  unmount = () => app.unmount();
  return content;
}
async function format(label: string, start: number, end = start) {
  const input = document.querySelector('textarea')!;
  input.focus();
  input.setSelectionRange(start, end);
  const button = [...document.querySelectorAll('button')].find(item => item.textContent?.replaceAll(/\s/g, '').includes(label))!;
  button.click();
  await nextTick();
  await nextTick();
  return input;
}
it('formats selected text without losing surrounding rules and keeps focus', async () => {
  const content = mount('请填写真实姓名后报名');
  const input = await format('加粗', 3, 7);
  expect(content.value).toBe('请填写**真实姓名**后报名');
  expect(document.activeElement).toBe(input);
  expect(input.value.slice(input.selectionStart, input.selectionEnd)).toBe('真实姓名');
});
it('formats whole selected lines as headings and lists', async () => {
  const content = mount('选择门店\n提交报名\n其他说明');
  await format('编号列表', 0, 9);
  expect(content.value).toBe('1. 选择门店\n2. 提交报名\n其他说明');
  await format('项目列表', 0, 15);
  expect(content.value).toBe('- 选择门店\n- 提交报名\n其他说明');
  await format('小标题', 0, 6);
  expect(content.value).toBe('### 选择门店\n- 提交报名\n其他说明');
});
it('has a larger input, examples, direct typing and the same length limit for formatting', async () => {
  const content = mount();
  const input = document.querySelector('textarea')!;
  expect(Number(input.rows)).toBe(8);
  expect(input.placeholder).toContain('###');
  expect(input.placeholder).toContain('**');
  input.value = '参与须知';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  expect(content.value).toBe('参与须知');
  input.value = '文'.repeat(20_005);
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  expect(content.value).toHaveLength(20_000);
  await format('加粗', 0, 2);
  expect(content.value).toHaveLength(20_000);
});
