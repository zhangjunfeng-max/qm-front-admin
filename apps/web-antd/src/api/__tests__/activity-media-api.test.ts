import { afterEach, describe, expect, it, vi } from 'vitest';

import { uploadActivityMedia } from '../activity-media';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: { post } }));
afterEach(() => {
  vi.unstubAllGlobals();
  post.mockReset();
});
describe('activity storage upload', () => {
  it('requests a tenant ticket and uploads the actual bytes without business credentials', async () => {
    const file = new File(['music'], 'music.mp3', { type: 'audio/mpeg' });
    post.mockResolvedValue({
      fileUrl: 'https://cos.example.com/music.mp3',
      uploadUrl: 'https://cos.example.com/music.mp3?signature=short',
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
    });
    const put = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', put);
    expect(await uploadActivityMedia(file, 'activity-1')).toBe(
      'https://cos.example.com/music.mp3',
    );
    expect(post).toHaveBeenCalledWith(
      '/admin/activities/activity-1/files/presign-upload',
      { filename: 'music.mp3', contentType: 'audio/mpeg', size: file.size },
    );
    expect(put).toHaveBeenCalledWith(
      'https://cos.example.com/music.mp3?signature=short',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: file,
        credentials: 'omit',
        signal: expect.any(AbortSignal),
      },
    );
  });
  it('does not save a file URL after storage rejects the upload', async () => {
    post.mockResolvedValue({
      fileUrl: 'https://cos.example.com/file.png',
      uploadUrl: 'https://cos.example.com/upload',
      method: 'PUT',
      headers: {},
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    await expect(
      uploadActivityMedia(new File(['x'], 'file.png'), ''),
    ).rejects.toThrow('上传失败');
  });
});
