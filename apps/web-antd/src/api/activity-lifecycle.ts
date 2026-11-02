import type { Activity, ListQuery, PageResult } from './management';

import { requestClient } from '#/api/request';

export type ActivityStatus =
  | 'approved'
  | 'archived'
  | 'draft'
  | 'ended'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'running';
export const activityStatusOptions: { label: string; value: ActivityStatus }[] =
  [
    { label: '草稿', value: 'draft' },
    { label: '审核中', value: 'pending_review' },
    { label: '审核未通过', value: 'rejected' },
    { label: '审核通过', value: 'approved' },
    { label: '已发布', value: 'published' },
    { label: '进行中', value: 'running' },
    { label: '已结束', value: 'ended' },
    { label: '已归档', value: 'archived' },
  ];
export function activityStatusLabel(status: string) {
  return (
    activityStatusOptions.find((item) => item.value === status)?.label ?? status
  );
}
export function activityStatusColor(status: string) {
  return (
    (
      {
        approved: 'success',
        pending_review: 'processing',
        rejected: 'error',
        published: 'cyan',
        running: 'success',
        ended: 'default',
        draft: 'default',
        archived: 'default',
      } as Record<string, string>
    )[status] ?? 'default'
  );
}
export type ActivityTransition =
  | 'publish'
  | 'submit-review'
  | 'withdraw-review';
export function transitionActivity(
  id: string,
  version: number,
  action: ActivityTransition,
) {
  return requestClient.post<Activity>(`/admin/activities/${id}/${action}`, {
    version,
  });
}
export interface PlatformActivity extends Activity {
  companyName: string;
}
export function getPlatformActivities(params: ListQuery) {
  return requestClient.get<PageResult<PlatformActivity>>(
    '/platform/activities',
    { params },
  );
}
export function getPlatformActivity(id: string, signal?: AbortSignal) {
  return requestClient.get<PlatformActivity>(`/platform/activities/${id}`, {
    signal,
  });
}
export async function reviewActivity(
  id: string,
  version: number,
  decision: 'approved' | 'rejected',
  rawReason = '',
) {
  const reason = rawReason.trim();
  if (decision === 'rejected' && !reason)
    throw new Error('请填写审核未通过原因');
  if ([...reason].length > 1000) throw new Error('审核原因最多1000字');
  return requestClient.post<PlatformActivity>(
    `/platform/activities/${id}/review`,
    { version, decision, reason },
  );
}
export function getPlatformActivityMedia(
  id: string,
  fileUrl: string,
  signal?: AbortSignal,
) {
  return requestClient.post<{ url: string; expiresAt: string }>(
    `/platform/activities/${id}/files/presign-read`,
    { fileUrl },
    { signal },
  );
}
