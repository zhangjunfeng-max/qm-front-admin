import { requestClient } from '#/api/request';

export namespace PlatformApi {
  export interface Tenant {
    contactName: string;
    contactPhone: string;
    industry: string;
    address: string;
    expiresAt: null | string;
    remark: string;
    memberCount: number;
    updatedAt: string;
    id: string;
    name: string;

    status: 'active' | 'disabled';
    createdAt: string;
  }
  export interface TenantQuery {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: 'active' | 'disabled';
  }
  export interface TenantPage {
    items: Tenant[];
    total: number;
    page: number;
    pageSize: number;
  }
  export interface User {
    id: string;
    phone: string;
    displayName: string;
    status: 'active' | 'disabled';
    isPlatformAdmin: boolean;
    companyCount: number;
    lastLoginAt: null | string;
    createdAt: string;
    updatedAt: string;
  }
  export interface UserCompany {
    tenantId: string;
    name: string;
    employeeName: string;
    role: 'admin' | 'member';
    status: 'active' | 'disabled';
    tenantStatus: 'active' | 'disabled';
  }
  export interface UserDetail extends User {
    companies: UserCompany[];
  }
  export interface UserQuery {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: 'active' | 'disabled';
    identity?: 'ordinary' | 'platform';
    membership?: 'joined' | 'unjoined';
  }
  export interface UserPage {
    items: User[];
    total: number;
    page: number;
    pageSize: number;
  }
  export type UserUpdate = Pick<
    User,
    'displayName' | 'isPlatformAdmin' | 'status'
  >;
  export type UserCreate = UserUpdate & { phone: string; password: string };
  export type PaymentProvider = 'aggregate' | 'alipay' | 'wechat';
  export interface PaymentBinding {
    tenantId: string;
    tenantName: string;
    tenantAlias: string;
    isDefault: boolean;
    status: 'active' | 'disabled';
    enableJsapi: boolean;
    miniappIds: string[];
  }
  export interface PaymentAccount {
    id: string;
    provider: PaymentProvider;
    accountName: string;
    externalAccountId: string;
    maskedAccount: string;
    callbackKey: string;
    capabilities: string[];
    merchantSerialNumber: string;
    status: 'active' | 'disabled';
    changeLockedReason: string;
    lastVerifiedAt: null | string;
    version: number;
    hasApiV3Key: boolean;
    hasPrivateKey: boolean;
    hasWechatPayPublicKey: boolean;
    bindings: PaymentBinding[];
    updatedAt: string;
  }
  export interface PaymentAccountInput {
    provider: PaymentProvider;
    accountName: string;
    externalAccountId: string;
    callbackKey: string;
    capabilities: string[];
    apiV3Key: string;
    merchantPrivateKey: string;
    merchantSerialNumber: string;
    wechatPayPublicKey: string;
    wechatPayPublicKeyId: string;
    status: 'active' | 'disabled';
    version: number;
  }
  export interface PaymentBindingInput {
    tenantAlias: string;
    isDefault: boolean;
    status: 'active' | 'disabled';
    enableJsapi: boolean;
    miniappIds: string[];
  }
  export interface PaymentAccountQuery {
    tenantId?: string;
    provider?: PaymentProvider;
    status?: 'active' | 'disabled';
    page?: number;
    pageSize?: number;
  }
  export interface PaymentException {
    id: string;
    eventKey: string;
    tenantId: null | string;
    tenantName: string;
    orderId: null | string;
    paymentAccountId: null | string;
    provider: string;
    exceptionType: string;
    severity: 'critical' | 'info' | 'warning';
    status: 'ignored' | 'open' | 'resolved';
    orderNo: string;
    outTradeNo: string;
    externalTransactionId: string;
    amountCent: number;
    details: Record<string, unknown>;
    resolutionNote: string;
    resolvedBy: null | string;
    resolvedAt: null | string;
    createdAt: string;
    updatedAt: string;
  }
  export interface MiniappOption {
    id: string;
    name: string;
    appid: string;
    status: 'active' | 'disabled';
    authorizationStatus: 'authorized' | 'pending' | 'unauthorized';
  }
}
export function getPlatformTenantsApi(params: PlatformApi.TenantQuery) {
  return requestClient.get<PlatformApi.TenantPage>('/platform/tenants', {
    params,
  });
}

export type TenantUpdate = Pick<
  PlatformApi.Tenant,
  | 'address'
  | 'contactName'
  | 'contactPhone'
  | 'expiresAt'
  | 'industry'
  | 'name'
  | 'remark'
  | 'status'
>;
export function getPlatformTenantApi(id: string) {
  return requestClient.get<PlatformApi.Tenant>(`/platform/tenants/${id}`);
}
export function updatePlatformTenantApi(id: string, data: TenantUpdate) {
  return requestClient.put<PlatformApi.Tenant>(`/platform/tenants/${id}`, data);
}

export type TenantCreate = TenantUpdate & {
  adminPhone: string;
  adminName: string;
  adminPassword?: string;
};
export function createPlatformTenantApi(data: TenantCreate) {
  return requestClient.post<PlatformApi.Tenant>('/platform/tenants', data);
}

export function getPlatformUsersApi(params: PlatformApi.UserQuery) {
  return requestClient.get<PlatformApi.UserPage>('/platform/users', { params });
}
export function getPlatformUserApi(id: string) {
  return requestClient.get<PlatformApi.UserDetail>(`/platform/users/${id}`);
}
export function updatePlatformUserApi(
  id: string,
  data: PlatformApi.UserUpdate,
) {
  return requestClient.put<PlatformApi.UserDetail>(
    `/platform/users/${id}`,
    data,
  );
}
export function createPlatformUserApi(data: PlatformApi.UserCreate) {
  return requestClient.post<PlatformApi.UserDetail>('/platform/users', data);
}

export function getPlatformPaymentAccountsApi(params: PlatformApi.PaymentAccountQuery) {
  return requestClient.get<{
    items: PlatformApi.PaymentAccount[];
    page: number;
    pageSize: number;
    total: number;
  }>('/platform/payment-accounts', { params });
}
export function getPlatformPaymentAccountApi(id: string) {
  return requestClient.get<PlatformApi.PaymentAccount>(
    `/platform/payment-accounts/${id}`,
  );
}
export function createPlatformPaymentAccountApi(
  data: PlatformApi.PaymentAccountInput,
) {
  return requestClient.post<PlatformApi.PaymentAccount>(
    '/platform/payment-accounts',
    data,
  );
}
export function updatePlatformPaymentAccountApi(
  id: string,
  data: PlatformApi.PaymentAccountInput,
) {
  return requestClient.put<PlatformApi.PaymentAccount>(
    `/platform/payment-accounts/${id}`,
    data,
  );
}
export function bindPlatformPaymentAccountApi(
  accountId: string,
  tenantId: string,
  data: PlatformApi.PaymentBindingInput,
) {
  return requestClient.put<PlatformApi.PaymentAccount>(
    `/platform/payment-accounts/${accountId}/tenants/${tenantId}`,
    data,
  );
}
export function unbindPlatformPaymentAccountApi(
  accountId: string,
  tenantId: string,
) {
  return requestClient.delete(
    `/platform/payment-accounts/${accountId}/tenants/${tenantId}`,
  );
}
export function getPlatformPaymentMiniappsApi(tenantId: string) {
  return requestClient.get<{ items: PlatformApi.MiniappOption[] }>(
    `/platform/tenants/${tenantId}/payment-miniapps`,
  );
}
export function getPlatformPaymentExceptionsApi(params: {
  page?: number;
  pageSize?: number;
  status?: 'ignored' | 'open' | 'resolved';
  type?: string;
}) {
  return requestClient.get<{
    items: PlatformApi.PaymentException[];
    page: number;
    pageSize: number;
    total: number;
  }>('/platform/payment-exceptions', { params });
}
export function resolvePlatformPaymentExceptionApi(
  id: string,
  data: { note: string; status: 'ignored' | 'resolved' },
) {
  return requestClient.post(`/platform/payment-exceptions/${id}/resolve`, data);
}
