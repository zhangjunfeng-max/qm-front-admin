import { requestClient } from './request';

export type NotificationScope = 'admin' | 'platform';
export interface Notice {
  id: string;
  title: string;
  message: string;
  kind: string;
  createdAt: string;
  isRead: boolean;
}
export interface NoticeDetail extends Notice {
  link: string;
  changes?: { field: string; label: string; before: string; after: string }[];
}
export interface NoticeQuery {
  page: number;
  pageSize: number;
  status: 'all' | 'unread';
  kind?: string;
}
export interface NoticeList {
  items: Notice[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  canPublish: boolean;
}
export interface Announcement {
  requestId: string;
  title: string;
  message: string;
  audience: 'all' | 'roles' | 'users';
  roles?: ('admin' | 'member')[];
  userIds?: string[];
  companyIds?: string[];
}
export interface RecipientQuery {
  keyword?: string;
  page: number;
  pageSize: number;
}
export interface RecipientList {
  items: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
}
const path = (scope: NotificationScope) => `/${scope}/notifications`;
export const notificationApi = {
  list: (scope: NotificationScope, params: NoticeQuery, signal: AbortSignal) =>
    requestClient.get<NoticeList>(path(scope), { params, signal }),
  detail: (scope: NotificationScope, id: string, signal: AbortSignal) =>
    requestClient.get<NoticeDetail>(
      `${path(scope)}/${encodeURIComponent(id)}`,
      { signal },
    ),
  read: (scope: NotificationScope, id: string, signal: AbortSignal) =>
    requestClient.post<void>(
      `${path(scope)}/${encodeURIComponent(id)}/read`,
      undefined,
      { signal },
    ),
  readAll: (scope: NotificationScope, signal: AbortSignal) =>
    requestClient.post<void>(`${path(scope)}/read-all`, undefined, { signal }),
  remove: (scope: NotificationScope, id: string, signal: AbortSignal) =>
    requestClient.delete<void>(`${path(scope)}/${encodeURIComponent(id)}`, {
      signal,
    }),
  clear: (scope: NotificationScope, signal: AbortSignal) =>
    requestClient.post<void>(`${path(scope)}/clear`, undefined, { signal }),
  publish: (
    scope: NotificationScope,
    body: Announcement,
    signal: AbortSignal,
  ) =>
    requestClient.post<{ recipients: number }>(
      `${path(scope)}/announcements`,
      body,
      { signal },
    ),
  recipients: (
    scope: NotificationScope,
    params: RecipientQuery,
    signal: AbortSignal,
  ) =>
    requestClient.get<RecipientList>(`${path(scope)}/recipients`, {
      params,
      signal,
    }),
};
