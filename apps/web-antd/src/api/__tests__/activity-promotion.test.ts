import { describe, expect, it, vi } from 'vitest';

vi.mock('#/api/request', () => ({ requestClient: {} }));

import {
  buildActivityH5Url,
  promotionImageExtension,
} from '../activity-promotion';

const id = '12345678-1234-1234-1234-123456789abc';
describe('activity promotion links', () => {
  it('preserves the deployment subpath and routes to the activity without employee attribution', () => {
    expect(buildActivityH5Url('https://example.com/campaign', id)).toBe(
      'https://example.com/campaign/#/pages/index/index?id=12345678-1234-1234-1234-123456789abc',
    );
    expect(buildActivityH5Url('http://localhost:5173/', id)).toBe(
      'http://localhost:5173/#/pages/index/index?id=12345678-1234-1234-1234-123456789abc',
    );
  });
  it.each([
    '',
    '/campaign',
    'invalid',
    'javascript:alert(1)',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com/?redirect=x',
    'https://example.com/#old',
    'https://example.com/?',
    'https://example.com/#',
  ])('rejects unusable H5 configuration: %s', (base) => {
    expect(() => buildActivityH5Url(base, id)).toThrow();
  });
  it('rejects route manipulation through invalid activity IDs', () => {
    expect(() =>
      buildActivityH5Url('https://example.com/', 'a&salesId=b'),
    ).toThrow();
  });
  it('accepts only base64 PNG or JPEG data for display and download', () => {
    expect(promotionImageExtension('data:image/png;base64,aGVsbG8=')).toBe(
      'png',
    );
    expect(promotionImageExtension('data:image/jpeg;base64,aGVsbG8=')).toBe(
      'jpg',
    );
    for (const value of [
      'https://example.com/x.png',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:text/html;base64,eA==',
      'data:image/png;base64,!!',
      '',
    ]) {
      expect(promotionImageExtension(value)).toBeNull();
    }
  });
});
