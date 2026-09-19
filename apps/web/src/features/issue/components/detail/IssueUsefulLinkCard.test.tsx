import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { JSDOM } from 'jsdom';
import common from '../../../../../messages/en/common.json';
import issue from '../../../../../messages/en/issue.json';
import type { ResolvedLinkPreview } from '@/components/common/editor/resolveLinkPreview';

let preview: ResolvedLinkPreview | undefined;
let previewPending = false;
let enabledCalls: boolean[] = [];
const link = {
  id: 7,
  url: 'https://docs.example.com/path?q=1',
  createdAt: '2026-01-01T00:00:00Z',
};
const { mock } = createRequire(import.meta.url)('bun:test') as {
  mock: { module: (specifier: string, factory: () => object) => void };
};

mock.module('@/components/common/editor/useLinkPreviewQuery', () => ({
  useLinkPreviewQuery: (_url: string, enabled = true) => {
    enabledCalls.push(enabled);
    return { data: preview, isPending: previewPending };
  },
}));
mock.module('../../services/useful-links.service', () => ({
  useUsefulLinksQuery: () => ({ data: [link], isPending: false }),
  useCreateUsefulLink: () => ({ isPending: false, mutate: () => {} }),
  useDeleteUsefulLink: () => ({ isPending: false, mutate: () => {} }),
}));

const { default: IssueUsefulLinkCard } = await import('./IssueUsefulLinkCard');
const { default: IssueUsefulLinksGroup } = await import('./IssueUsefulLinksGroup');

let root: Root;
let createRoot: (typeof import('react-dom/client'))['createRoot'];
let dom: JSDOM;
let client: QueryClient;
let observerCallback: IntersectionObserverCallback;
let descriptors: Map<string, PropertyDescriptor | undefined>;

function render(readOnly = false) {
  act(() =>
    root.render(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="en" messages={{ common, issue }} timeZone="UTC">
          <IssueUsefulLinkCard issueId={42} link={link} readOnly={readOnly} />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    ),
  );
}

function renderGroup(readOnly = false) {
  act(() =>
    root.render(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="en" messages={{ common, issue }} timeZone="UTC">
          <IssueUsefulLinksGroup issueId={42} readOnly={readOnly} />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    ),
  );
}

beforeEach(async () => {
  descriptors = new Map(
    [
      'window',
      'document',
      'navigator',
      'HTMLElement',
      'IntersectionObserver',
      'IS_REACT_ACT_ENVIRONMENT',
    ].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  dom = new JSDOM('<div id="root"></div>', { url: 'https://app.example.test' });
  class TestIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      observerCallback = callback;
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    HTMLElement: { configurable: true, value: dom.window.HTMLElement },
    IntersectionObserver: { configurable: true, value: TestIntersectionObserver },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  preview = undefined;
  previewPending = false;
  enabledCalls = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  ({ createRoot } = await import('react-dom/client'));
  root = createRoot(document.getElementById('root')!);
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  dom.window.close();
  for (const [name, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe('IssueUsefulLinkCard', () => {
  it('uses a safe explicit external anchor and hides delete from readers', () => {
    render(true);
    const anchor = document.querySelector('a');
    assert.ok(anchor);
    assert.equal(anchor.href, link.url);
    assert.equal(anchor.target, '_blank');
    assert.equal(anchor.rel, 'noopener noreferrer');
    assert.equal(anchor.getAttribute('referrerpolicy'), 'no-referrer');
    assert.ok(document.body.textContent?.includes('docs.example.com'));
    assert.ok(document.body.textContent?.includes(link.url));
    assert.equal(document.querySelector('button'), null);
  });

  it('shows the delete control to editors', () => {
    render();
    assert.equal(
      document.querySelector('button')?.getAttribute('aria-label'),
      `Delete link ${link.url}`,
    );
  });

  it('activates preview loading on viewport, focus, and hover', () => {
    render();
    assert.equal(enabledCalls.at(-1), false);
    act(() =>
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    assert.equal(enabledCalls.at(-1), true);

    act(() => root.unmount());
    const container = document.getElementById('root')!;
    root = createRoot(container);
    enabledCalls = [];
    render();
    act(() =>
      document
        .querySelector('a')
        ?.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true })),
    );
    assert.equal(enabledCalls.at(-1), true);

    act(() => root.unmount());
    root = createRoot(container);
    enabledCalls = [];
    render();
    act(() =>
      document
        .querySelector('a')
        ?.dispatchEvent(new dom.window.Event('pointerover', { bubbles: true })),
    );
    assert.equal(enabledCalls.at(-1), true);
  });

  it('keeps the destination visible when preview retrieval fails', () => {
    render();
    act(() =>
      document
        .querySelector('a')
        ?.dispatchEvent(new dom.window.Event('pointerover', { bubbles: true })),
    );
    assert.ok(document.body.textContent?.includes(issue.usefulLinks.previewUnavailable));
    assert.ok(document.body.textContent?.includes(link.url));
  });
});

describe('IssueUsefulLinksGroup', () => {
  it('shows add and delete controls only to editors', () => {
    renderGroup(true);
    assert.equal(document.querySelectorAll('button').length, 0);

    renderGroup();
    const buttons = [...document.querySelectorAll('button')];
    assert.ok(buttons.some((button) => button.textContent?.includes(issue.usefulLinks.add)));
    assert.ok(
      buttons.some((button) => button.getAttribute('aria-label')?.startsWith('Delete link')),
    );
  });
});
