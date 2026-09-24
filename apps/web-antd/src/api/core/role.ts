import { requestClient } from '#/api/request';

export namespace SystemRoleApi {
  export type SortField =
    | 'createTime'
    | 'id'
    | 'roleCode'
    | 'roleName'
    | 'status'
    | 'updateTime';

  export interface RoleListItem {
    createTime: string;
    id: string;
    remark: string;
    roleCode: string;
    roleName: string;
    status: 0 | 1;
    updateTime: string;
  }

  export interface RolePageParams {
    endTime?: string;
    keyword?: string;
    pageNum: number;
    pageSize: 20 | 50 | 100 | 200;
    sortBy?: SortField;
    sortOrder?: 'asc' | 'desc';
    startTime?: string;
    status?: 0 | 1;
  }

  export interface RolePageResult {
    pageNum: number;
    pageSize: number;
    records: RoleListItem[];
    total: number;
  }

  export interface RoleSaveParams {
    remark?: string;
    roleCode?: string;
    roleName: string;
    status: 0 | 1;
  }

  export type RoleUpdateParams = Omit<RoleSaveParams, 'roleCode'>;

  export interface MenuAssignNode {
    id: string;
    title: string;
    menuType: 'BUTTON' | 'CATALOG' | 'MENU';
    authCode?: string;
    children?: MenuAssignNode[];
  }

  export interface RoleMenuAssignment {
    menus: MenuAssignNode[];
    selectedMenuIds: string[];
  }
}

export async function getRolePageApi(params: SystemRoleApi.RolePageParams) {
  return requestClient.get<SystemRoleApi.RolePageResult>('/system/role/page', {
    params,
  });
}

export async function getRoleDetailApi(roleId: string) {
  return requestClient.get<SystemRoleApi.RoleListItem>(
    `/system/role/${roleId}`,
  );
}

export async function createRoleApi(data: SystemRoleApi.RoleSaveParams) {
  return requestClient.post<SystemRoleApi.RoleListItem>('/system/role', data);
}

export async function updateRoleApi(
  roleId: string,
  data: SystemRoleApi.RoleUpdateParams,
) {
  return requestClient.put<SystemRoleApi.RoleListItem>(
    `/system/role/${roleId}`,
    data,
  );
}

export async function deleteRoleApi(roleId: string) {
  return requestClient.delete(`/system/role/${roleId}`);
}

export async function batchDeleteRolesApi(roleIds: string[]) {
  return requestClient.post('/system/role/batch-delete', { roleIds });
}

export async function getRoleMenuAssignmentApi(roleId: string) {
  return requestClient.get<SystemRoleApi.RoleMenuAssignment>(
    `/system/role/${roleId}/menus`,
  );
}

export async function assignRoleMenusApi(roleId: string, menuIds: string[]) {
  return requestClient.put(`/system/role/${roleId}/menus`, { ids: menuIds });
}
