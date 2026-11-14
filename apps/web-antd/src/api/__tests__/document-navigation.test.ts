import { expect, it, vi } from 'vitest';

import { reloadDocument } from '../../router/document-navigation';

function browser(href: string) {
  return {
    location: { href, reload: vi.fn(), replace: vi.fn() },
    history: { replaceState: vi.fn() },
  };
}

it.each(['/#/home', '/#/platform/overview'])(
  'reloads the document even for a hash-only destination %s',
  (destination) => {
    const target = browser('https://admin.example.com/#/home');
    reloadDocument(destination, target);
    expect(target.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      `https://admin.example.com${destination}`,
    );
    expect(target.location.reload).toHaveBeenCalledOnce();
    expect(target.location.replace).not.toHaveBeenCalled();
  },
);

it('replaces the document when history routing changes the pathname', () => {
  const target = browser('https://admin.example.com/platform/overview');
  reloadDocument('/home', target);
  expect(target.location.replace).toHaveBeenCalledWith(
    'https://admin.example.com/home',
  );
  expect(target.location.reload).not.toHaveBeenCalled();
});
