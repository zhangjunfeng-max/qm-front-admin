import { requestClient } from '#/api/request';

export interface CompanyOverviewSummary {
  netRevenueCent: number;
  collectedCent: number;
  refundedCent: number;
  paidOrders: number;
  refundedOrders: number;
  registrations: number;
  newContacts: number;
  pendingPayment: number;
  pendingRegistration: number;
  activities: number;
  runningActivities: number;
  views: number;
}
export interface CompanyPerformance {
  id: string;
  name: string;
  activityName: string;
  netRevenueCent: number;
  paidOrders: number;
  registrations: number;
}
export interface CompanyBusinessOverview {
  generatedAt: string;
  month: string;
  manager: boolean;
  canManageOrders: boolean;
  summary: CompanyOverviewSummary;
  employees: CompanyPerformance[];
  groups: CompanyPerformance[];
}
export interface CompanyOverviewQuery {
  limit: 5 | 10;
  rankBy: 'registrations' | 'revenue';
}
export function getCompanyOverviewApi(params: CompanyOverviewQuery, signal?: AbortSignal) {
  return requestClient.get<CompanyBusinessOverview>('/admin/overview', { params, signal });
}
