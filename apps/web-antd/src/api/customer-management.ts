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
  customerId?: string;
  activityId?: string;
  participation?: string;
}
export const getCustomers = (params: ListQuery & { kind?: string }) =>
  requestClient.get<PageResult<Customer>>('/admin/customers', { params });
export const getOrders = (params: OrderQuery) =>
  requestClient.get<PageResult<ActivityOrder>>('/admin/orders', { params });
export const getOrder = (id: string) =>
  requestClient.get<OrderDetail>(`/admin/orders/${id}`);

export const getCustomerManagementAccess = () =>
  requestClient.get<{ canManageOrders: boolean }>(
    '/admin/customer-management/access',
  );
