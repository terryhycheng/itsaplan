import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { JSDOM } from 'jsdom';
import common from '../../../../../messages/en/common.json';
import settings from '../../../../../messages/en/settings.json';
import type { PermissionAction } from '@/lib/api/endpoints/roles';
import type { RecurringIssue } from '@/lib/api/endpoints/recurringIssues';

let allowed = new Set<PermissionAction>();
const { mock } = createRequire(import.meta.url)('bun:test') as {
  mock: { module: (specifier: string, factory: () => object) => void };
};

mock.module('../../context/settingsPermission', () => ({
  useSettingsCan: () => (action: PermissionAction) => allowed.has(action),
}));

const { default: SettingsRecurringIssueRow } = await import('./SettingsRecurringIssueRow');

const recurringIssue: RecurringIssue = {
  id: 1,
  projectId: 1,
  name: 'Weekly planning',
  status: 'active',
  frequency: 'weekly',
  interval: 1,
  weekdays: [1],
  dayOfMonth: null,
  month: null,
  startDate: '2026-01-01',
  localTime: '09:00',
  timezone: 'UTC',
  endDate: null,
  maxOccurrences: null,
  occurrenceCount: 0,
  nextRunAt: '2026-01-05T09:00:00Z',
  lastRunAt: null,
  lastError: null,
  title: 'Plan the week',
  description: '',
  columnId: 1,
  typeId: null,
  initiativeId: null,
  assigneeUserId: null,
  delegateUserId: null,
  priority: null,
  estimatePoints: null,
  estimateMinutes: null,
  startOffsetDays: null,
  dueOffsetDays: null,
  labelIds: [],
  fieldValues: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

let root: Root;
let dom: JSDOM;
let descriptors: Map<string, PropertyDescriptor | undefined>;

function render() {
  act(() =>
    root.render(
      <NextIntlClientProvider locale="en" messages={{ common, settings }} timeZone="UTC">
        <SettingsRecurringIssueRow
          recurringIssue={recurringIssue}
          onEdit={() => {}}
          onToggle={() => {}}
          onCancel={() => {}}
          onHistory={() => {}}
        />
      </NextIntlClientProvider>,
    ),
  );
}

beforeEach(async () => {
  allowed = new Set();
  descriptors = new Map(
    ['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  dom = new JSDOM('<div id="root"></div>');
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import('react-dom/client');
  root = createRoot(document.getElementById('root')!);
});

afterEach(() => {
  act(() => root.unmount());
  dom.window.close();
  for (const [name, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe('SettingsRecurringIssueRow', () => {
  it('shows history without mutation actions to a reader', () => {
    render();
    const titles = [...document.querySelectorAll('button')].map((button) => button.title);
    assert.deepEqual(titles, ['Occurrence history']);
  });

  it('shows lifecycle actions allowed by the role', () => {
    allowed = new Set(['edit', 'delete']);
    render();
    const titles = [...document.querySelectorAll('button')].map((button) => button.title);
    assert.deepEqual(titles, ['Occurrence history', 'Pause', 'Edit', 'Cancel recurrence']);
  });
});
