import type { MusicOption } from '../music';

import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ActivityMusicSelect from '../../components/management/activity-music-select.vue';
const api = vi.hoisted(() => ({ options: vi.fn(), preview: vi.fn() }));
vi.mock('#/api/music', () => ({
  getMusicOptions: api.options,
  previewMusic: api.preview,
}));
const track: MusicOption = {
  id: 'music-a',
  name: '原创春日',
  status: 'active',
};
let cleanup: (() => void) | undefined;
beforeEach(() => {
  api.options.mockReset();
  api.preview.mockReset();
});
afterEach(() => {
  cleanup?.();
  document.body.innerHTML = '';
});
function mount(initial: null | string = null, current?: MusicOption) {
  const state = reactive({ value: initial, id: '' });
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({
    render: () =>
      h(ActivityMusicSelect, {
        activityId: state.id,
        current,
        modelValue: state.value,
        'onUpdate:modelValue': (value) => (state.value = value),
      }),
  });
  app.mount(root);
  cleanup = () => app.unmount();
  return { state, root };
}
it('does not select or play music without an explicit choice, even with a single track', async () => {
  api.options.mockResolvedValue({
    items: [track],
    total: 1,
    page: 1,
    pageSize: 100,
  });
  const { state, root } = mount();
  await vi.waitFor(() => expect(api.options).toHaveBeenCalled());
  await nextTick();
  expect(state.value).toBeNull();
  expect(root.querySelector('audio')).toBeNull();
  expect(api.preview).not.toHaveBeenCalled();
  expect(root.querySelector('.ant-upload')).toBeNull();
});
it('retains disabled music but disables playback', async () => {
  api.options.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 100,
  });
  const { state, root } = mount('music-a', { ...track, status: 'disabled' });
  await vi.waitFor(() => expect(root.textContent).toContain('已停用'));
  expect(state.value).toBe('music-a');
  expect(root.querySelector('button')?.disabled).toBe(true);
});
it('previews only after clicking and stops the player when selection changes', async () => {
  api.options.mockResolvedValue({
    items: [track],
    total: 1,
    page: 1,
    pageSize: 100,
  });
  api.preview.mockResolvedValue({
    url: 'https://cdn.example.com/original.mp3',
  });
  const { state, root } = mount('music-a', track);
  root.querySelector('button')!.click();
  await vi.waitFor(() =>
    expect(root.querySelector('audio')?.src).toBe(
      'https://cdn.example.com/original.mp3',
    ),
  );
  state.value = null;
  await nextTick();
  expect(root.querySelector('audio')).toBeNull();
});
it('ignores stale preview requests after changing activity', async () => {
  let resolve!: (value: unknown) => void;
  api.options.mockResolvedValue({
    items: [track],
    total: 1,
    page: 1,
    pageSize: 100,
  });
  api.preview.mockImplementation(() => new Promise((done) => (resolve = done)));
  const { state, root } = mount('music-a', track);
  root.querySelector('button')!.click();
  state.id = 'another';
  await nextTick();
  resolve({ url: 'https://cdn.example.com/old.mp3' });
  await nextTick();
  await nextTick();
  expect(root.querySelector('audio')).toBeNull();
});
