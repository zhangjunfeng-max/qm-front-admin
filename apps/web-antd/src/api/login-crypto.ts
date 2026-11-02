export interface LoginPublicKey {
  algorithm: 'RSA-OAEP-256';
  challenge: string;
  expiresIn: number;
  keyId: string;
  publicKey: string;
}

/** OAEP-SHA256 works on LAN HTTP too, where crypto.subtle is unavailable. */
export async function encryptLoginPassword(
  password: string,
  key: LoginPublicKey,
  phone: string,
): Promise<string> {
  if (key.algorithm !== 'RSA-OAEP-256')
    throw new Error('暂时无法登录，请刷新页面后重试');
  const bytes = new TextEncoder().encode(password);
  if (bytes.length < 8 || bytes.length > 128)
    throw new Error('密码长度不符合要求，请使用8–128位字母、数字或符号');
  const { default: forge } = await import('node-forge');
  const publicKey = forge.pki.publicKeyFromPem(key.publicKey);
  const label = JSON.stringify([
    'group-biz/login/v2',
    key.keyId,
    key.challenge,
    phone,
  ]);
  const encrypted = publicKey.encrypt(
    forge.util.encodeUtf8(password),
    'RSA-OAEP',
    {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
      label,
    },
  );
  return forge.util.encode64(encrypted);
}
