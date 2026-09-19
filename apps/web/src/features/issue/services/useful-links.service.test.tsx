import assert from 'node:assert/strict';
import { afterEach, beforeEach, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSDOM } from 'jsdom';
import { useCreateUsefulLink, useDeleteUsefulLink } from './useful-links.service';
import { qk } from '@/services/queryKeys';

let root: Root;
let dom: JSDOM;
let client: QueryClient;
let createLink: ReturnType<typeof useCreateUsefulLink>;
let deleteLink: ReturnType<typeof useDeleteUsefulLink>;
let descriptors: Map<string, PropertyDescriptor | undefined>;
const issueId = 42;

function Harness() {
  createLink = useCreateUsefulLink(issueId);
  deleteLink = useDeleteUsefulLink(issueId);
  return null;
}

beforeEach(async () => {
  descriptors = new Map(
    ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'fetch'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  dom = new JSDOM('<div id="root"></div>');
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
    fetch: {
      configurable: true,
      value: async (_input: string | URL | Request, init?: RequestInit) =>
        init?.method === 'DELETE'
          ? new Response(null, { status: 204 })
          : Response.json({
              id: 7,
              url: 'https://example.com/',
              createdAt: '2026-01-01T00:00:00Z',
            }),
    },
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { createRoot } = await import('react-dom/client');
  root = createRoot(document.getElementById('root')!);
  act(() =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  act(() => root.unmount());
  client.clear();
  dom.window.close();
  for (const [name, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

it('invalidates useful links after create and delete', async () => {
  const key = qk.usefulLinks(issueId);
  client.setQueryData(key, []);
  await act(async () => {
    await createLink.mutateAsync('https://example.com');
  });
  assert.equal(client.getQueryState(key)?.isInvalidated, true);

  client.setQueryData(key, []);
  await act(async () => {
    await deleteLink.mutateAsync(7);
  });
  assert.equal(client.getQueryState(key)?.isInvalidated, true);
});
