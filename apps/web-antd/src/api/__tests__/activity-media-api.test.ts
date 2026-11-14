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
    const file = new File(['image'], 'poster.jpg', { type: 'image/jpeg' });
    post.mockResolvedValue({
      fileUrl: 'https://cos.example.com/poster.jpg',
      uploadUrl: 'https://cos.example.com/poster.jpg?signature=short',
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
    });
    const put = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', put);
    expect(await uploadActivityMedia(file, 'activity-1')).toBe(
      'https://cos.example.com/poster.jpg',
    );
    expect(post).toHaveBeenCalledWith(
      '/admin/activities/activity-1/files/presign-upload',
      { filename: 'poster.jpg', contentType: 'image/jpeg', size: file.size },
    );
    expect(put).toHaveBeenCalledWith(
      'https://cos.example.com/poster.jpg?signature=short',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
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
