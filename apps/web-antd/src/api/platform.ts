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
    role: 'admin' | 'member' | 'owner';
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
  ownerPhone: string;
  ownerName: string;
  ownerPassword?: string;
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
