import { describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: client }));

import {
  activityStatusLabel,
  activityStatusOptions,
  reviewActivity,
  transitionActivity,
} from '../activity-lifecycle';

describe('activity lifecycle', () => {
  it('labels every review/publication phase separately', () => {
    expect(activityStatusOptions.map((x) => x.value)).toEqual([
      'draft',
      'pending_review',
      'rejected',
      'approved',
      'published',
      'running',
      'ended',
      'archived',
    ]);
    expect(activityStatusLabel('approved')).toBe('审核通过');
    expect(activityStatusLabel('published')).toBe('已发布');
    expect(activityStatusLabel('running')).toBe('进行中');
  });
  it('submits the captured version to the explicit company transition endpoint', async () => {
    await transitionActivity('one', 7, 'submit-review');
    expect(client.post).toHaveBeenLastCalledWith(
      '/admin/activities/one/submit-review',
      { version: 7 },
    );
    await transitionActivity('one', 8, 'publish');
    expect(client.post).toHaveBeenLastCalledWith(
      '/admin/activities/one/publish',
      { version: 8 },
    );
  });
  it('blocks blank rejection before calling the platform API and trims reasons', async () => {
    client.post.mockClear();
    await expect(reviewActivity('one', 4, 'rejected', '  ')).rejects.toThrow(
      '请填写审核未通过原因',
    );
    expect(client.post).not.toHaveBeenCalled();
    await reviewActivity('one', 4, 'rejected', ' 海报不完整 ');
    expect(client.post).toHaveBeenLastCalledWith(
      '/platform/activities/one/review',
      { version: 4, decision: 'rejected', reason: '海报不完整' },
    );
  });
});
