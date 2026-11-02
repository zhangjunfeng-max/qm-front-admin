// Decoded claims only check client consistency. The server verifies signatures and permissions.
export function credentialContext(token: null | string) {
  try {
    const encoded = token?.split('.')[1];
    if (!encoded) return null;
    const payload = JSON.parse(
      atob(encoded.replaceAll('-', '+').replaceAll('_', '/')),
    );
    if (typeof payload.tid !== 'string' || typeof payload.sub !== 'string')
      return null;
    return { tenantId: payload.tid as string, userId: payload.sub as string };
  } catch {
    return null;
  }
}

export function credentialContextMatches(
  token: null | string,
  displayed: null | { tenantId?: unknown; userId?: unknown },
) {
  if (!token || !displayed) return true;
  const claims = credentialContext(token);
  return (
    claims !== null &&
    claims.tenantId === displayed.tenantId &&
    claims.userId === displayed.userId
  );
}
