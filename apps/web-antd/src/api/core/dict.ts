import { requestClient } from '#/api/request';

export namespace SystemDictApi {
  export type SortField =
    | 'createTime'
    | 'dictCode'
    | 'dictName'
    | 'id'
    | 'status'
    | 'updateTime';
  export interface DictListItem {
    id: string;
    dictName: string;
    dictCode: string;
    status: 0 | 1;
    remark: string;
    createTime: string;
    updateTime: string;
  }
  export interface DictPageParams {
    endTime?: string;
    keyword?: string;
    pageNum: number;
    pageSize: 20 | 50 | 100 | 200;
    sortBy?: SortField;
    sortOrder?: 'asc' | 'desc';
    startTime?: string;
    status?: 0 | 1;
  }
  export interface DictPageResult {
    pageNum: number;
    pageSize: number;
    records: DictListItem[];
    total: number;
  }
  export interface DictSaveParams {
    dictName: string;
    dictCode?: string;
    status: 0 | 1;
    remark?: string;
  }
  export interface DictItem {
    id: string;
    dictId: string;
    itemName: string;
    itemCode: string;
    sort: number;
    color: string;
    icon: string;
    status: 0 | 1;
    createTime: string;
    updateTime: string;
  }
  export interface DictItemSaveParams {
    itemName: string;
    itemCode: string;
    sort?: number;
    color?: string;
    icon?: string;
    status: 0 | 1;
  }
}

export async function getDictPageApi(params: SystemDictApi.DictPageParams) {
  return requestClient.get<SystemDictApi.DictPageResult>('/system/dict/page', {
    params,
  });
}
export async function getDictDetailApi(id: string) {
  return requestClient.get<SystemDictApi.DictListItem>(`/system/dict/${id}`);
}
export async function createDictApi(data: SystemDictApi.DictSaveParams) {
  return requestClient.post('/system/dict', data);
}
export async function updateDictApi(
  id: string,
  data: Omit<SystemDictApi.DictSaveParams, 'dictCode'>,
) {
  return requestClient.put(`/system/dict/${id}`, data);
}
export async function deleteDictApi(id: string) {
  return requestClient.delete(`/system/dict/${id}`);
}
export async function getDictItemsApi(dictId: string) {
  return requestClient.get<SystemDictApi.DictItem[]>(
    `/system/dict/${dictId}/items`,
  );
}
export async function createDictItemApi(
  dictId: string,
  data: SystemDictApi.DictItemSaveParams,
) {
  return requestClient.post(`/system/dict/${dictId}/items`, data);
}
export async function updateDictItemApi(
  dictId: string,
  itemId: string,
  data: SystemDictApi.DictItemSaveParams,
) {
  return requestClient.put(`/system/dict/${dictId}/items/${itemId}`, data);
}
export async function deleteDictItemApi(dictId: string, itemId: string) {
  return requestClient.delete(`/system/dict/${dictId}/items/${itemId}`);
}
export async function batchDeleteDictItemsApi(
  dictId: string,
  itemIds: string[],
) {
  return requestClient.post(`/system/dict/${dictId}/items/batch-delete`, {
    itemIds,
  });
}
