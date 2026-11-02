import { requestClient } from '#/api/request';

export interface OverviewSummary {
  totalCompanies: number;
  activeCompanies: number;
  todayCompanies: number;
  expiredCompanies: number;
  expiringCompanies: number;
  totalActivities: number;
  draftActivities: number;
  pendingReviewActivities: number;
  approvedActivities: number;
  rejectedActivities: number;
  todayActivities: number;
  runningActivities: number;
  scheduledActivities: number;
  endedActivities: number;
  unscheduledActivities: number;
  archivedActivities: number;
  activeEmployees: number;
  pendingApplications: number;
  views: null | number;
  orders: null | number;
  todayOrders: null | number;
}
export interface OverviewDay {
  date: string;
  newActivities: number;
  newCompanies: number;
}
export interface PlatformOverview {
  generatedAt: string;
  timeZone: string;
  days: number;
  summary: OverviewSummary;
  trend: OverviewDay[];
}
export interface CompanyOverview {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  expiresAt: null | string;
  totalActivities: number;
  todayActivities: number;
  runningActivities: number;
  activeEmployees: number;
  pendingApplications: number;
  lastActivityAt: null | string;
  todayOrders: null | number;
}
export interface CompanyOverviewQuery {
  page: number;
  pageSize: number;
  keyword?: string;
}
export interface CompanyOverviewPage {
  generatedAt: string;
  items: CompanyOverview[];
  total: number;
  page: number;
  pageSize: number;
}

export function getPlatformOverviewApi(days: 7 | 30, signal?: AbortSignal) {
  return requestClient.get<PlatformOverview>('/platform/overview', {
    params: { days },
    signal,
  });
}
export function getPlatformCompanyOverviewApi(
  params: CompanyOverviewQuery,
  signal?: AbortSignal,
) {
  return requestClient.get<CompanyOverviewPage>(
    '/platform/overview/companies',
    {
      params,
      signal,
    },
  );
}
