import JSEncrypt from 'jsencrypt';

import { baseRequestClient, requestClient } from '#/api/request';

const LOGIN_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5aNxgVfwqzOVw0jbX7huiBthJWA6i2mwcIqsynhY6SDx8DWX10YRs72CyKPmb9HGHM1DS+SnRec1zkERHJcgmtXPFdjEA/+MWYBcrfk1C7Owc11ucPqPbtSbHAHnzwIv6J9HAyPLmMHHDY1ndr65Q52JXDvkn58viGNeoQDPfjTTd4Axz7q07n94JDxtBuZblDbI9PQy0FHFon+xr9LilvT4tlQwDs4MmRJWSn7SI28LiIVU5Ih3qN6hVnk81ZJqwzsw0FKjSU4H4n+4fSaF8DD4Qn3kflYXxKMSnHX9JCicsI+/hyTH/h9lKG2Xs/H/RHoKtpzFSB7J+TBFGO9R4QIDAQAB
-----END PUBLIC KEY-----`;

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export type RefreshTokenResult = string;
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(LOGIN_RSA_PUBLIC_KEY);
  const encryptedPassword = data.password
    ? encryptor.encrypt(data.password)
    : false;
  if (!encryptedPassword) {
    throw new Error('登录密码加密失败');
  }
  return requestClient.post<AuthApi.LoginResult>('/system/auth/login', {
    ...data,
    password: encryptedPassword,
  });
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return requestClient.post<AuthApi.RefreshTokenResult>(
    '/system/auth/refresh',
    undefined,
    { withCredentials: true },
  );
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post('/system/auth/logout', undefined, {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/system/auth/codes');
}
