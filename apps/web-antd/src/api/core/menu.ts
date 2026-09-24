import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  return requestClient.get<RouteRecordStringComponent[]>('/system/menu/all');
}

export namespace SystemMenuApi {
  export type MenuType = 'BUTTON' | 'CATALOG' | 'MENU';
  export interface MenuItem {
    id: string;
    parentId: string;
    menuType: MenuType;
    name: string;
    path: string;
    component: string;
    redirect: string;
    icon: string;
    title: string;
    sort: number;
    status: 0 | 1;
    visible: 0 | 1;
    keepAlive: 0 | 1;
    affixTab: 0 | 1;
    authCode: string;
    hasChildren: boolean;
    createTime?: string;
    updateTime?: string;
    children?: MenuItem[];
  }

  export interface MenuQuery {
    parentId?: string;
    status?: 0 | 1;
  }
  export type MenuSaveParams = Omit<
    MenuItem,
    'children' | 'createTime' | 'hasChildren' | 'id' | 'parentId' | 'updateTime'
  > & { parentId?: string };
}

export async function getMenuChildrenApi(params: SystemMenuApi.MenuQuery = {}) {
  return requestClient.get<SystemMenuApi.MenuItem[]>('/system/menu/children', {
    params,
  });
}

export async function getMenuDetailApi(menuId: string) {
  return requestClient.get<SystemMenuApi.MenuItem>(`/system/menu/${menuId}`);
}

export async function createMenuApi(data: SystemMenuApi.MenuSaveParams) {
  return requestClient.post<SystemMenuApi.MenuItem>('/system/menu', data);
}

export async function updateMenuApi(
  menuId: string,
  data: SystemMenuApi.MenuSaveParams,
) {
  return requestClient.put<SystemMenuApi.MenuItem>(
    `/system/menu/${menuId}`,
    data,
  );
}

export async function deleteMenuApi(menuId: string) {
  return requestClient.delete(`/system/menu/${menuId}`);
}
