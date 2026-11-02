import type { ActivityTheme } from '../activity-theme';

import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, expect, it } from 'vitest';

import ThemeSelect from '../../components/management/activity-theme-select.vue';

let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
});
function mount(theme: ActivityTheme = 'festive', color = '#E53935') {
  const selected = ref(theme);
  const themeColor = ref(color);
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({
    render: () =>
      h(ThemeSelect, {
        theme: selected.value,
        themeColor: themeColor.value,
        'onUpdate:theme': (value: ActivityTheme) => {
          selected.value = value;
        },
        'onUpdate:themeColor': (value: string) => {
          themeColor.value = value;
        },
      }),
  });
  app.mount(root);
  unmount = () => app.unmount();
  return { selected, themeColor };
}
function button(label: string) {
  const result = [...document.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(label),
  );
  if (!result) throw new Error(`missing ${label}`);
  return result;
}

it('lets a customer choose a named preset without seeing or entering a color code', async () => {
  const state = mount();
  expect(document.querySelector('input[type="color"]')).toBeNull();
  expect(document.body.textContent).not.toContain('#');
  button('淡蓝').click();
  await nextTick();
  expect(state.selected.value).toBe('sky');
  expect(state.themeColor.value).toBe('#69A9E8');
  expect(button('淡蓝').getAttribute('aria-pressed')).toBe('true');
});

it('preserves an edited custom color and allows recoloring only after opening customization', async () => {
  const state = mount('romantic', '#123456');
  expect(state.themeColor.value).toBe('#123456');
  expect(document.body.textContent).toContain('已自定义');
  button('自定义颜色').click();
  await nextTick();
  const picker = document.querySelector<HTMLInputElement>(
    'input[type="color"]',
  )!;
  picker.value = '#abcdef';
  picker.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  expect(state.selected.value).toBe('romantic');
  expect(state.themeColor.value).toBe('#ABCDEF');
  button('恢复预设').click();
  await nextTick();
  expect(state.themeColor.value).toBe('#DB7296');
});
