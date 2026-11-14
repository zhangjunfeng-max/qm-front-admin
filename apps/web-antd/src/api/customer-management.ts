import type { ListQuery, PageResult } from './management';

import { requestClient } from './request';

export interface Customer {
  id: string;
  kind: 'lead' | 'wechat';
  phone: string;
  displayName: string;
  orderCount: number;
  createdAt: string;
  lastRegistrationAt: null | string;
  customerPhone: string;
  salesName: string;
  activityName: string;
  latestStatus: '' | ActivityOrder['status'];
  pendingOrderCount: number;
  pendingRegistrationCount: number;
  lastOrderAt: null | string;
  lastContactAt: null | string;
}
export interface ActivityOrder {
  id: string;
  orderNo: string;
  activityId: string;
  customerId: string;
  activityName: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  participation: 'free' | 'group' | 'single';
  status: 'confirmed' | 'pending_payment' | 'pending_registration';
  amountCent: number;
  createdAt: string;
  registeredAt: null | string;
  contactSavedAt: null | string;
  salesName: string;
  salesPhone: string;
}
export interface OrderDetail extends ActivityOrder {
  answers: { key: string; label: string; value: string }[];
  paymentInfo: null | Record<string, unknown>;
  refundInfo: null | Record<string, unknown>;
}
export interface OrderQuery extends ListQuery {
  onlySelf?: boolean;
  period?: 'month' | 'today';
  event?: 'paid' | 'registrations';
  customerId?: string;
  activityId?: string;
  participation?: string;
}
export interface OrdersPageResult extends PageResult<ActivityOrder> {
  hasPaymentRecords: boolean;
  /** Counts share the active filters except status, across every page. */
  statusCounts?: Record<ActivityOrder['status'], number>;
}

/** 一次活动参与。没有订单时 status 为 pending，不需要伪造订单状态。 */
export interface Registration {
  id: string;
  orderId: string;
  orderNo: string;
  activityId: string;
  customerId: string;
  activityName: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  participation: 'free' | 'group' | 'single';
  status: 'pending' | 'pending_payment' | 'registered';
  amountCent: number;
  /** 填写姓名手机的时间 */
  createdAt: string;
  orderCreatedAt: null | string;
  registeredAt: null | string;
  salesName: string;
  salesPhone: string;
}
export interface RegistrationDetail extends Registration {
  answers: { key: string; label: string; value: string }[];
  paymentInfo: null | Record<string, unknown>;
  refundInfo: null | Record<string, unknown>;
}
export interface RegistrationsPageResult extends PageResult<Registration> {
  hasPaymentRecords: boolean;
  statusCounts?: Record<Registration['status'], number>;
}
export const getCustomers = (params: ListQuery & { kind?: string }) =>
  requestClient.get<PageResult<Customer>>('/admin/customers', { params });
export const getRegistrations = (params: OrderQuery, signal?: AbortSignal) =>
  requestClient.get<RegistrationsPageResult>('/admin/registrations', {
    params,
    signal,
  });
export const getRegistration = (id: string, signal?: AbortSignal) =>
  requestClient.get<RegistrationDetail>(`/admin/registrations/${id}`, {
    signal,
  });
export const getOrders = (params: OrderQuery, signal?: AbortSignal) =>
  requestClient.get<OrdersPageResult>('/admin/orders', {
    params,
    signal,
  });
export const getOrder = (id: string, signal?: AbortSignal) =>
  requestClient.get<OrderDetail>(`/admin/orders/${id}`, { signal });

export interface ExportQuery {
  /** 必填：不同活动的表单字段无法对齐成同一组列 */
  activityId: string;
  status?: string;
  participation?: string;
  keyword?: string;
}

/** 导出单个活动的报名名单 CSV，返回原始 Blob（含 UTF-8 BOM）。 */
export const exportRegistrations = (params: ExportQuery) =>
  requestClient.get<Blob>('/admin/registrations/export', {
    params,
    responseType: 'blob',
  });
