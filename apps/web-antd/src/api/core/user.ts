import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemUserApi {
  export type SortField =
    | 'accountStatus'
    | 'createTime'
    | 'id'
    | 'isTenantAdmin'
    | 'memberStatus'
    | 'realName'
    | 'updateTime'
    | 'username';

  export interface UserListItem {
    accountStatus: 0 | 1;
    avatar: string;
    createTime: string;
    description: string;
    id: string;
    isTenantAdmin: 0 | 1;
    memberStatus: 0 | 1;
    realName: string;
    updateTime: string;
    username: string;
  }

  export interface UserPageParams {
    accountStatus?: 0 | 1;
    endTime?: string;
    isTenantAdmin?: 0 | 1;
    keyword?: string;
    memberStatus?: 0 | 1;
    pageNum: number;
    pageSize: 20 | 50 | 100 | 200;
    sortBy?: SortField;
    sortOrder?: 'asc' | 'desc';
    startTime?: string;
  }

  export interface UserPageResult {
    pageNum: number;
    pageSize: number;
    records: UserListItem[];
    total: number;
  }

  export interface UserSaveParams {
    accountStatus: 0 | 1;
    avatar?: string;
    description?: string;
    isTenantAdmin: 0 | 1;
    memberStatus: 0 | 1;
    password?: string;
    realName: string;
    username?: string;
  }

  export type UserUpdateParams = Omit<UserSaveParams, 'password' | 'username'>;

  export interface RoleAssignOption {
    id: string;
    roleCode: string;
    roleName: string;
    status: 0 | 1;
  }

  export interface UserRoleAssignment {
    roles: RoleAssignOption[];
    selectedRoleIds: string[];
  }
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/system/user/info');
}

/**
 * 分页查询当前租户内的系统用户。
 */
export async function getUserPageApi(params: SystemUserApi.UserPageParams) {
  return requestClient.get<SystemUserApi.UserPageResult>('/system/user/page', {
    params,
  });
}

export async function getUserDetailApi(userId: string) {
  return requestClient.get<SystemUserApi.UserListItem>(
    `/system/user/${userId}`,
  );
}

export async function createUserApi(data: SystemUserApi.UserSaveParams) {
  return requestClient.post<SystemUserApi.UserListItem>('/system/user', data);
}

export async function updateUserApi(
  userId: string,
  data: SystemUserApi.UserUpdateParams,
) {
  return requestClient.put<SystemUserApi.UserListItem>(
    `/system/user/${userId}`,
    data,
  );
}

export async function deleteUserApi(userId: string) {
  return requestClient.delete(`/system/user/${userId}`);
}

export async function batchDeleteUsersApi(userIds: string[]) {
  return requestClient.post('/system/user/batch-delete', { userIds });
}

export async function getUserRoleAssignmentApi(userId: string) {
  return requestClient.get<SystemUserApi.UserRoleAssignment>(
    `/system/user/${userId}/roles`,
  );
}

export async function assignUserRolesApi(userId: string, roleIds: string[]) {
  return requestClient.put(`/system/user/${userId}/roles`, { ids: roleIds });
}
