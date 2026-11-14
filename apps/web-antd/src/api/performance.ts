import { requestClient } from '#/api/request';

export interface PerformanceStats {
  registrations: number;
  collectedCent: number;
  paidOrders: number;
  refundedCent: number;
  netCent: number;
}
export interface PerformanceRow extends PerformanceStats {
  id: string;
  name: string;
  activityName: string;
  activityId: string;
  rank: number;
  historical: boolean;
  members?: PerformanceRow[];
}
export interface PerformanceEvent {
  id: string;
  salesId: null | string;
  salesName: string;
  activityName: string;
  kind: 'payment' | 'registration';
  amountCent: number;
}
export interface PerformanceBoard {
  generatedAt: string;
  month: string;
  scope: 'all' | 'group' | 'self';
  metric: 'registrations' | 'revenue';
  summary: PerformanceStats;
  unassigned: PerformanceStats;
  ungrouped: PerformanceRow;
  employees: PerformanceRow[];
  groups: PerformanceRow[];
  mine: null | PerformanceRow;
  cursor: string;
  events: PerformanceEvent[];
}
export interface PerformanceQuery {
  activityId?: string;
  metric?: 'registrations' | 'revenue';
  after?: string;
}
export function getPerformanceBoard(
  params: PerformanceQuery,
  signal?: AbortSignal,
) {
  return requestClient.get<PerformanceBoard>('/admin/performance', {
    params,
    signal,
  });
}
