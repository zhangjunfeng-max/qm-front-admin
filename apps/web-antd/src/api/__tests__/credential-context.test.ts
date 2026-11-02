import { expect, it } from 'vitest';

import { credentialContextMatches } from '../credential-context';

function token(tenantId: string, userId = 'account') {
  return `header.${btoa(JSON.stringify({ tid: tenantId, sub: userId }))}.signature`;
}
it('blocks credentials hydrated from another company or account before a request is sent', () => {
  const displayed = { tenantId: 'company-a', userId: 'account' };
  expect(credentialContextMatches(token('company-a'), displayed)).toBe(true);
  expect(credentialContextMatches(token('company-b'), displayed)).toBe(false);
  expect(
    credentialContextMatches(token('company-a', 'another-account'), displayed),
  ).toBe(false);
  expect(credentialContextMatches('malformed', displayed)).toBe(false);
});
