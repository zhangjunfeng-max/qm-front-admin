import { createApp, reactive } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useActivityMedia } from '../../components/management/activity-media';
import { defaultActivity } from '../activity-form';

const { uploadActivityMedia, previewActivityMedia, compressImage } = vi.hoisted(
  () => ({
    uploadActivityMedia: vi.fn(),
    previewActivityMedia: vi.fn(),
    compressImage: vi.fn(),
  }),
);
vi.mock('browser-image-compression', () => ({
  default: Object.assign(compressImage, {
    getDataUrlFromFile: async () => 'data:image/jpeg;base64,AA==',
    loadImage: async () => ({ width: 2400, height: 3600 }),
  }),
}));
vi.mock('#/api/activity-media', () => ({
  uploadActivityMedia,
  previewActivityMedia,
}));
const unmounts: (() => void)[] = [];
function editor() {
  const form = reactive(defaultActivity());
  let assets!: ReturnType<typeof useActivityMedia>;
  const app = createApp({
    setup() {
      assets = useActivityMedia(form, () => 'activity-1');
      return () => null;
    },
  });
  app.mount(document.createElement('div'));
  unmounts.push(() => app.unmount());
  return { form, assets };
}
beforeEach(() => {
  uploadActivityMedia.mockReset();
  previewActivityMedia.mockReset();
  compressImage.mockReset().mockImplementation(async (file: File) => file);
  let serial = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(
    () => `blob:local-${++serial}`,
  );
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  unmounts.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('activity local media staging', () => {
  it('selects locally and records bytes, then uploads only on save and reuses completed files', async () => {
    const { form, assets } = editor();
    const file = new File(['original-jpeg'], 'photo.jpg', {
      type: 'image/jpeg',
    });
    const local = await assets.prepare(file, 'image');
    form.posterUrl = local!;
    expect(uploadActivityMedia).not.toHaveBeenCalled();
    expect(assets.info(local!)).toMatchObject({
      size: file.size,
      originalSize: file.size,
      width: 2400,
      height: 3600,
    });
    uploadActivityMedia.mockResolvedValue('https://cos.example.com/photo.jpg');
    await assets.uploadPending();
    await assets.uploadPending();
    expect(uploadActivityMedia).toHaveBeenCalledTimes(1);
    expect(form.posterUrl).toBe('https://cos.example.com/photo.jpg');
    expect(form.mediaFiles[form.posterUrl]?.size).toBe(file.size);
    expect(form.mediaFiles[form.posterUrl]).toMatchObject({
      width: 2400,
      height: 3600,
    });
    expect(await uploadActivityMedia.mock.calls[0]![0].text()).toBe(
      'original-jpeg',
    );
  });
  it('preserves sorting and skips completed uploads when retrying a partial failure', async () => {
    const { form, assets } = editor();
    const one = await assets.prepare(new File(['one'], '1.jpg'), 'image');
    const two = await assets.prepare(new File(['two'], '2.mp4'), 'video');
    form.detailMedia = [
      { type: 'video', url: two! },
      { type: 'image', url: one! },
    ];
    uploadActivityMedia
      .mockResolvedValueOnce('https://cos.example.com/2.mp4')
      .mockRejectedValueOnce(new Error('offline'));
    await expect(assets.uploadPending()).rejects.toThrow('offline');
    expect(form.detailMedia).toEqual([
      { type: 'video', url: 'https://cos.example.com/2.mp4' },
      { type: 'image', url: one },
    ]);
    uploadActivityMedia.mockResolvedValueOnce('https://cos.example.com/1.jpg');
    await assets.uploadPending();
    expect(uploadActivityMedia).toHaveBeenCalledTimes(3);
    expect(form.detailMedia).toEqual([
      { type: 'video', url: 'https://cos.example.com/2.mp4' },
      { type: 'image', url: 'https://cos.example.com/1.jpg' },
    ]);
    expect(Object.keys(form.mediaFiles)).toHaveLength(2);
  });
  it('stages video bytes unchanged and rejects oversized or unsupported videos', async () => {
    const { form, assets } = editor();
    const file = new File([new Uint8Array(11 * 1024 * 1024)], 'clip.mp4');
    const url = await assets.prepare(file, 'video');
    form.detailMedia = [{ type: 'video', url: url! }];
    expect(uploadActivityMedia).not.toHaveBeenCalled();
    expect(assets.info(url!)).toMatchObject({
      size: file.size,
      originalSize: file.size,
      contentType: 'video/mp4',
    });
    uploadActivityMedia.mockResolvedValue('https://cos.example.com/clip.mp4');
    await assets.uploadPending();
    await assets.uploadPending();
    expect(uploadActivityMedia).toHaveBeenCalledTimes(1);
    expect(uploadActivityMedia.mock.calls[0]![0].size).toBe(file.size);
    expect(form.detailMedia).toEqual([
      { type: 'video', url: 'https://cos.example.com/clip.mp4' },
    ]);
    await expect(
      assets.prepare(new File(['bad'], 'clip.mov'), 'video'),
    ).rejects.toThrow('MP4');
    await expect(
      assets.prepare(
        new File([new Uint8Array(50 * 1024 * 1024 + 1)], 'huge.mp4'),
        'video',
      ),
    ).rejects.toThrow('50MB');
  });
  it('uses JPEG optimization output and checks the processed size rather than original size', async () => {
    const { assets } = editor();
    compressImage.mockResolvedValue(
      new File([new Uint8Array(380 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      }),
    );
    const url = await assets.prepare(
      new File([new Uint8Array(2 * 1024 * 1024)], 'large.jpg'),
      'image',
    );
    expect(assets.info(url!)).toMatchObject({
      size: 389_120,
      originalSize: 2_097_152,
      contentType: 'image/jpeg',
    });
  });
  it('accepts processed images up to 4MB without applying the old 1MB limit', async () => {
    const { assets } = editor();
    const url = await assets.prepare(
      new File([new Uint8Array(4 * 1024 * 1024)], 'poster.jpg'),
      'image',
    );
    expect(assets.info(url!)?.size).toBe(4_194_304);
  });
  it('records the actual output type and filename when a PNG becomes WebP', async () => {
    const { form, assets } = editor();
    compressImage.mockResolvedValue(
      new File(['webp'], 'poster.webp', { type: 'image/webp' }),
    );
    const url = await assets.prepare(
      new File([new Uint8Array(2 * 1024 * 1024)], 'poster.png'),
      'image',
    );
    form.posterUrl = url!;
    expect(assets.info(url!)).toMatchObject({
      name: 'poster.webp',
      contentType: 'image/webp',
      size: 4,
    });
    uploadActivityMedia.mockResolvedValue(
      'https://cos.example.com/poster.webp',
    );
    await assets.uploadPending();
    expect(uploadActivityMedia.mock.calls[0]![0].type).toBe('image/webp');
    expect(uploadActivityMedia.mock.calls[0]![0].name).toBe('poster.webp');
  });
  it('rejects images over 4MB after processing before staging or uploading', async () => {
    const { form, assets } = editor();
    const file = new File(
      [new Uint8Array(4 * 1024 * 1024 + 1)],
      'too-large.webp',
    );
    await expect(assets.prepare(file, 'image')).rejects.toThrow('4MB');
    expect(Object.keys(form.mediaFiles)).toHaveLength(0);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(uploadActivityMedia).not.toHaveBeenCalled();
  });
  it('does not upload removed selections or unchanged remote files and cleans local previews', async () => {
    const { form, assets } = editor();
    const local = await assets.prepare(
      new File(['unused'], 'unused.jpg'),
      'image',
    );
    form.posterUrl = 'https://cos.example.com/existing.jpg';
    await assets.uploadPending();
    expect(uploadActivityMedia).not.toHaveBeenCalled();
    expect(form.mediaFiles).not.toHaveProperty(local!);
    assets.clear();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(local);
  });
});

it('stops saving and does not apply a late media upload after the editor is discarded', async () => {
  const { form, assets } = editor();
  const local = await assets.prepare(new File(['one'], '1.jpg'), 'image');
  form.posterUrl = local!;
  let release!: (url: string) => void;
  uploadActivityMedia.mockImplementation(
    () =>
      new Promise<string>((resolve) => {
        release = resolve;
      }),
  );
  const pending = assets.uploadPending();
  const rejected = expect(pending).rejects.toThrow();
  assets.clear();
  release('https://cos.example.com/late.jpg');
  await rejected;
  expect(form.posterUrl).toBe(local);
  expect(form.mediaFiles).not.toHaveProperty(
    'https://cos.example.com/late.jpg',
  );
});
