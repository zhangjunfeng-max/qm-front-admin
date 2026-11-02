import type { UserInfo } from '@vben/types';

import type { AuthApi } from './auth';

import { useAccessStore } from '@vben/stores';

import { sessionContext } from '#/api/company-context';
import { requestClient } from '#/api/request';

/** Revalidate identity on page reload; the role comes from a verified token. */
export async function getUserInfoApi(): Promise<UserInfo> {
  const me = await requestClient.get<AuthApi.MeResult>('/auth/me');
  return {
    avatar: '',
    desc: '',
    homePath: sessionContext(me.user, me.tenant).homePath,
    realName: me.user.displayName || me.user.phone,
    roles: sessionContext(me.user, me.tenant).roles,
    tenantId: me.tenantId,
    token: useAccessStore().accessToken ?? '',
    userId: me.userId,
    username: me.user.phone,
  };
}
