import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getMusicOptions,
  normalizeMusicFile,
  previewMusic,
  saveMusic,
  uploadMusic,
} from '../music';

const { get, post, put, assertCurrent } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  assertCurrent: vi.fn(),
}));
vi.mock('#/api/request', () => ({ requestClient: { get, post, put } }));
vi.mock('../context-lifecycle', () => ({
  captureContext: () => ({
    assertCurrent,
    signal: new AbortController().signal,
  }),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe('platform music', () => {
  it('uses platform-only upload tickets and never forwards session credentials to storage', async () => {
    const file = new File(['audio'], '原创.mp3', { type: 'audio/mpeg' });
    post.mockResolvedValue({
      fileUrl: 'https://cos.example.com/platform/music/test.mp3',
      uploadUrl: 'https://cos.example.com/put?signature=test',
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
    });
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);
    expect(await uploadMusic(file)).toBe(
      'https://cos.example.com/platform/music/test.mp3',
    );
    expect(post).toHaveBeenCalledWith('/platform/music/files/presign-upload', {
      filename: '原创.mp3',
      contentType: 'audio/mpeg',
      size: 5,
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://cos.example.com/put?signature=test',
      expect.objectContaining({
        credentials: 'omit',
        signal: expect.any(AbortSignal),
        headers: { 'Content-Type': 'audio/mpeg' },
        body: expect.any(File),
      }),
    );
    expect(assertCurrent).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid files and a failed upload', async () => {
    expect(() => normalizeMusicFile(new File(['x'], 'x.mp4'))).toThrow(
      '请选择',
    );
    expect(() => normalizeMusicFile(new File([], 'x.mp3'))).toThrow('大于0');
    post.mockResolvedValue({
      uploadUrl: 'https://cos.example.com/put',
      method: 'PUT',
      headers: {},
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(uploadMusic(new File(['x'], 'x.mp3'))).rejects.toThrow(
      '上传失败',
    );
  });
  it('keeps company selection and previews separate from platform management', async () => {
    await getMusicOptions({ page: 1, pageSize: 100 });
    expect(get).toHaveBeenCalledWith('/admin/music', {
      params: { page: 1, pageSize: 100 },
    });
    await previewMusic('music-a');
    expect(get).toHaveBeenLastCalledWith('/admin/music/music-a/preview');
    await previewMusic('music-a', true);
    expect(get).toHaveBeenLastCalledWith('/platform/music/music-a/preview');
    const input = {
      name: '音乐',
      fileUrl: 'url',
      size: 1,
      contentType: 'audio/mpeg',
      licenseSource: '自制',
      status: 'active' as const,
      sortOrder: 0,
      version: 1,
    };
    await saveMusic('', input);
    expect(post).toHaveBeenLastCalledWith('/platform/music', input);
    await saveMusic('music-a', input);
    expect(put).toHaveBeenCalledWith('/platform/music/music-a', input);
  });
});
