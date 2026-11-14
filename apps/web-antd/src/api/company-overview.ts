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
export interface CompanyBusinessOverview {
  generatedAt: string;
  month: string;
  manager: boolean;
  personal: {
    collectedCent: number;
    pendingPayment: number;
    pendingRegistration: number;
    netRevenueCent: number;
    paidOrders: number;
    registrations: number;
  };
  joinedActivities: number;
  joinedRunningActivities: number;
  summary: CompanyOverviewSummary;
}
export function getCompanyOverviewApi(
  signal?: AbortSignal,
  period?: 'month' | 'today',
) {
  return requestClient.get<CompanyBusinessOverview>('/admin/overview', {
    signal,
    params: { period },
  });
}
