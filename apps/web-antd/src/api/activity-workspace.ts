import type { Activity, ActivityInput } from './management';

import { createActivityInput } from './activity-form';
import { requestClient } from './request';

export function copyActivityInput(source: ActivityInput): ActivityInput {
  return {
    ...createActivityInput(source),
    name: `${source.name}（副本）`.slice(0, 160),
    startsAt: null,
    endsAt: null,
  };
}

export function activityListActions(activity: Activity) {
  if (activity.status === 'archived') return ['records', 'restore'];
  if (activity.status === 'ended') return ['records', 'ranking', 'copy'];
  if (activity.status === 'pending_review') return ['edit', 'progress'];
  if (activity.status === 'approved') return ['publish', 'preview', 'edit'];
  if (['published', 'running'].includes(activity.status))
    return ['records', 'share', 'ranking', 'edit'];
  return ['edit', 'preview', 'submit-review'];
}

export interface ActivityPreview {
  name: string;
  themeColor: string;
  posterUrl: string;
  rulesText: string;
  startsAt: null | string;
  endsAt: null | string;
  detailMedia: { type: 'image' | 'video'; url: string }[];
  mediaUrls: Record<string, string>;
  formConfig: ActivityInput['formConfig'];
  registeredCount: number;
  viewCount: number;
}
export const getActivityPreview = (id: string, signal?: AbortSignal) =>
  requestClient.get<ActivityPreview>(`/admin/activities/${id}/preview`, {
    signal,
  });
