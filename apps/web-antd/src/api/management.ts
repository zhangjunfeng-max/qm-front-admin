import type { LoginPublicKey } from './login-crypto';
import type { PlatformApi } from './platform';

import { encryptLoginPassword } from './login-crypto';
import { authRequestClient, requestClient } from './request';
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface ListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  role?: string;
  groupId?: string;
}
export interface Employee {
  userId: string;
  phone: string;
  displayName: string;
  avatarUrl: string;
  remark: string;
  role: 'admin' | 'member' | 'owner';
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}
export type EmployeeInput = Pick<
  Employee,
  'avatarUrl' | 'displayName' | 'remark' | 'role' | 'status'
> & { phone?: string; password?: string };
export interface StoreOption {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'disabled';
}
export interface Store extends StoreOption {
  contactName: string;
  contactPhone: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}
export type StoreInput = Pick<
  Store,
  'address' | 'contactName' | 'contactPhone' | 'name' | 'remark' | 'status'
>;
export const getStores = (params: ListQuery) =>
  requestClient.get<PageResult<Store>>('/admin/stores', { params });
export const saveStore = (id: string, data: StoreInput) =>
  id
    ? requestClient.put<Store>(`/admin/stores/${id}`, data)
    : requestClient.post<Store>('/admin/stores', data);
export const saveActivityStores = (
  id: string,
  data: { version: number; storeIds: string[] },
) => requestClient.put<Activity>(`/admin/activities/${id}/stores`, data);
export const getActivityStoreOptions = (id: string, params: ListQuery) =>
  requestClient.get<PageResult<StoreOption>>(
    id
      ? `/admin/activities/${id}/store-options`
      : '/admin/activities/store-options',
    { params },
  );
export interface MiniappOption {
  id: string;
  name: string;
  appid: string;
  status: 'active' | 'disabled';
  authorizationStatus: 'authorized' | 'pending' | 'unauthorized';
}
export interface Miniapp extends MiniappOption {
  principalName: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}
export type MiniappInput = Omit<Miniapp, 'createdAt' | 'id' | 'updatedAt'>;
export const getMiniapps = (params: ListQuery) =>
  requestClient.get<PageResult<Miniapp>>('/admin/miniapps', { params });
export const saveMiniapp = (id: string, data: MiniappInput) =>
  id
    ? requestClient.put<Miniapp>(`/admin/miniapps/${id}`, data)
    : requestClient.post<Miniapp>('/admin/miniapps', data);
export const getActivityMiniappOptions = (id: string, params: ListQuery) =>
  requestClient.get<PageResult<MiniappOption>>(
    id
      ? `/admin/activities/${id}/miniapp-options`
      : '/admin/activities/miniapp-options',
    { params },
  );
export type ActivityRole = 'admin' | 'leader' | 'member';
export interface FormField {
  key: string;
  type:
    | 'boolean'
    | 'checkbox'
    | 'date'
    | 'email'
    | 'phone'
    | 'radio'
    | 'text'
    | 'textarea';
  label: string;
  placeholder: string;
  required: boolean;
  options?: { value: string; label: string }[];
}
export type ActivityContactSource = 'company' | 'sales' | 'store';
export interface ActivityMediaFile {
  name: string;
  size: number;
  originalSize: number;
  contentType: string;
}
export interface ActivityDetailMedia {
  type: 'image' | 'video';
  url: string;
}
export interface ActivityInput {
  theme: import('./activity-theme').ActivityTheme;
  themeColor: string;
  mediaFiles: Record<string, ActivityMediaFile>;
  contactPhonePriority: ActivityContactSource[];
  storeIds: string[];
  name: string;
  posterUrl: string;
  rulesText: string;
  detailMedia: ActivityDetailMedia[];
  startsAt: null | string;
  endsAt: null | string;
  groupEnabled: boolean;
  groupSize: number;
  groupPriceCent: null | number;
  singlePriceCent: null | number;
  formConfig: { fields: FormField[] };
  shareText: string;
  shareImageUrl: string;
  forwardText: string;
  forwardImageUrl: string;
  musicUrl: string;
  virtualViewCount: number;
  virtualRegistrationCount: number;
  employeeScope: 'all' | 'selected';
  employeeRegistrationEnabled: boolean;
  memberPerformanceScope: 'all' | 'group' | 'self';
  leaderPerformanceScope: 'all' | 'group';
  channel: 'h5' | 'h5_miniapp';
  miniappId: null | string;
}
export interface Activity extends ActivityInput {
  miniapp: MiniappOption | null;
  stores: StoreOption[];
  id: string;
  tenantId: string;
  status: import('./activity-lifecycle').ActivityStatus;
  storedStatus:
    | 'approved'
    | 'archived'
    | 'draft'
    | 'pending_review'
    | 'published'
    | 'rejected';
  submittedAt: null | string;
  reviewedAt: null | string;
  reviewedBy: null | string;
  reviewReason: string;
  publishedAt: null | string;
  canSubmitReview: boolean;
  canWithdrawReview: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canRestore: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  groupCount: number;
  currentRole: string;
  canEdit: boolean;
  canManageMembers: boolean;
  canManageGroups: boolean;
  canReviewApplications: boolean;
  performanceScope: string;
}
export interface ActivityGroup {
  id: string;
  name: string;
  sortOrder: number;
  memberCount: number;
}
export interface ActivityEmployee {
  userId: string;
  phone: string;
  displayName: string;
  avatarUrl: string;
  role: ActivityRole;
  groupId: null | string;
  groupName: string;
  status: 'approved' | 'disabled' | 'pending' | 'rejected';
  reviewRemark: string;
  createdAt: string;
  reviewedAt: null | string;
}
export interface Assignment {
  role: ActivityRole;
  groupId: null | string;
  status: 'approved' | 'disabled';
}
export type EmployeeBatchInput = (
  | { action: 'add' | 'adjust'; role: ActivityRole; groupId: null | string }
  | { action: 'review'; decision: 'approved' | 'rejected'; remark: string }
  | { action: 'status'; status: 'approved' | 'disabled' }
) & { userIds: string[] };
export const batchActivityEmployees = (id: string, data: EmployeeBatchInput) =>
  requestClient.post<{ changed: number; skipped: number }>(
    `/admin/activities/${id}/employees/batch`,
    data,
  );
export type CompanyInput = Pick<
  PlatformApi.Tenant,
  'address' | 'contactName' | 'contactPhone' | 'industry' | 'name' | 'remark'
>;
export const getCompany = () =>
  requestClient.get<PlatformApi.Tenant>('/admin/company');
export const saveCompany = (data: CompanyInput) =>
  requestClient.put<PlatformApi.Tenant>('/admin/company', data);
export const getEmployees = (params: ListQuery) =>
  requestClient.get<PageResult<Employee>>('/admin/employees', { params });
export const saveEmployee = (id: string, data: EmployeeInput) =>
  id
    ? requestClient.put<Employee>(`/admin/employees/${id}`, data)
    : requestClient.post<Employee>('/admin/employees', data);
export const getActivities = (params: ListQuery) =>
  requestClient.get<PageResult<Activity>>('/admin/activities', { params });
export const getActivity = (id: string) =>
  requestClient.get<Activity>(`/admin/activities/${id}`);
export const saveActivity = (
  id: string,
  data: ActivityInput & { version?: number },
) =>
  id
    ? requestClient.put<Activity>(`/admin/activities/${id}`, data)
    : requestClient.post<Activity>('/admin/activities', data);
export const changeActivityState = (record: Activity) =>
  requestClient.post<Activity>(
    `/admin/activities/${record.id}/${record.status === 'archived' ? 'restore' : 'archive'}`,
    { version: record.version },
  );
const base = (id: string) => `/admin/activities/${id}`;
export const getActivityGroups = (id: string) =>
  requestClient.get<{ items: ActivityGroup[] }>(`${base(id)}/groups`);
export const saveActivityGroup = (
  id: string,
  groupId: string,
  data: { name: string; sortOrder: number },
) =>
  groupId
    ? requestClient.put<ActivityGroup>(`${base(id)}/groups/${groupId}`, data)
    : requestClient.post<ActivityGroup>(`${base(id)}/groups`, data);
export const deleteActivityGroup = (id: string, groupId: string) =>
  requestClient.delete(`${base(id)}/groups/${groupId}`);
export const getActivityEmployees = (id: string, params: ListQuery) =>
  requestClient.get<PageResult<ActivityEmployee>>(`${base(id)}/employees`, {
    params,
  });
export const getEmployeeOptions = (id: string, params: ListQuery) =>
  requestClient.get<PageResult<Employee>>(`${base(id)}/employee-options`, {
    params,
  });
export const assignActivityEmployee = (
  id: string,
  userId: string,
  data: Assignment,
) => requestClient.put(`${base(id)}/employees/${userId}`, data);
export const reviewApplication = (
  id: string,
  userId: string,
  data: {
    decision: 'approved' | 'rejected';
    role: ActivityRole;
    groupId: null | string;
    remark: string;
  },
) => requestClient.post(`${base(id)}/applications/${userId}/review`, data);
export const getMyMembership = (id: string) =>
  requestClient.get<ActivityEmployee | null>(`${base(id)}/my-membership`);
export const applyActivity = (
  id: string,
  data: { role: ActivityRole; groupId: null | string },
) => requestClient.post(`${base(id)}/applications`, data);
export const getActivityInvitation = (id: string, reset = false) =>
  requestClient.post<{ token: string; registrationPath: string }>(
    `${base(id)}/invitation`,
    { reset },
  );
export interface Invitation {
  activityName: string;
  tenantName: string;
  groups: { id: string; name: string }[];
}
export const readInvitation = (token: string) =>
  authRequestClient.get<Invitation>(
    `/auth/activity-invitations/${encodeURIComponent(token)}`,
  );
export async function registerForActivity(input: {
  token: string;
  phone: string;
  displayName: string;
  password: string;
  role: ActivityRole;
  groupId: null | string;
}) {
  const key = await authRequestClient.get<LoginPublicKey>('/auth/public-key');
  const { password, ...data } = input;
  data.phone = data.phone.trim();
  const encryptedPassword = await encryptLoginPassword(
    password,
    key,
    data.phone,
  );
  return authRequestClient.post<{ message: string }>(
    '/auth/activity-register',
    { ...data, encryptedPassword, keyId: key.keyId, challenge: key.challenge },
  );
}
