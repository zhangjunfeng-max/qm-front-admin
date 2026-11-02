/* eslint-disable vue/one-component-per-file -- Each test mounts an isolated component. */
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { Upload } from 'ant-design-vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreviewUpload } from '../../adapter/component';

let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
describe('shared upload local staging', () => {
  it('runs the before-upload callback, accepts controlled file updates and never auto uploads ignored files', async () => {
    const files = ref<any[]>([]);
    const beforeUpload = vi.fn().mockResolvedValue(Upload.LIST_IGNORE);
    const app = createApp(
      defineComponent({
        setup() {
          return () =>
            h(
              PreviewUpload,
              {
                modelValue: files.value,
                'before-upload': beforeUpload,
                placeholder: '选择图片',
                listType: 'text',
                draggable: true,
                'onUpdate:modelValue': (value: any[]) => {
                  files.value = value;
                },
              },
              { default: () => '选图' },
            );
        },
      }),
    );
    const container = document.createElement('div');
    document.body.append(container);
    app.mount(container);
    unmount = () => app.unmount();
    await vi.waitFor(
      () => expect(container.querySelector('input[type=file]')).not.toBeNull(),
      { timeout: 5000 },
    );
    expect(container.querySelector('[draggable="true"]')).toBeNull();
    files.value = [
      { uid: 'blob:local-1', name: '本地暂存.txt', status: 'done' },
    ];
    await nextTick();
    expect(container.textContent).toContain('本地暂存.txt');
    const send = vi
      .spyOn(XMLHttpRequest.prototype, 'send')
      .mockImplementation(() => {});
    const file = new File(['image'], 'selected.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('input[type=file]')!;
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(beforeUpload).toHaveBeenCalledTimes(1));
    await nextTick();
    expect(send).not.toHaveBeenCalled();
    expect(files.value).toHaveLength(1);
    expect(container.textContent).not.toContain('selected.jpg');
  });
  it('enables item sorting after an edit form finishes loading and pauses it while disabled', async () => {
    const disabled = ref(true);
    const app = createApp({
      setup: () => () =>
        h(
          PreviewUpload,
          {
            modelValue: [{ uid: '1', name: 'one.jpg', status: 'done' }],
            draggable: true,
            disabled: disabled.value,
            listType: 'picture-card',
          },
          { default: () => '选择素材' },
        ),
    });
    const container = document.createElement('div');
    document.body.append(container);
    app.mount(container);
    unmount = () => app.unmount();
    await vi.waitFor(() =>
      expect(container.querySelector('.ant-upload-list')).not.toBeNull(),
    );
    const { default: Sortable } = await import(
      // @ts-expect-error Sortable modular build has no declarations.
      'sortablejs/modular/sortable.complete.esm.js'
    );
    disabled.value = false;
    await vi.waitFor(() =>
      expect(
        Sortable.get(container.querySelector('.ant-upload-list')),
      ).toBeDefined(),
    );
    const sortable = Sortable.get(container.querySelector('.ant-upload-list'));
    disabled.value = true;
    await nextTick();
    expect(sortable.option('disabled')).toBe(true);
  });
});
