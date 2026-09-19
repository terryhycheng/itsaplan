import { describe, expect, test } from 'bun:test';
import {
  localDateForInstant,
  nextOccurrence,
  type RecurrenceRule,
  validateRecurrenceRule,
} from '..';

const base: RecurrenceRule = {
  frequency: 'daily',
  interval: 1,
  startDate: '2026-01-01',
  time: '09:30',
  timezone: 'UTC',
};

describe('nextOccurrence', () => {
  test('includes the start instant when requested', () => {
    expect(
      nextOccurrence(base, new Date('2026-01-01T09:30:00Z'), { inclusive: true })?.toISOString(),
    ).toBe('2026-01-01T09:30:00.000Z');
  });

  test('anchors daily intervals to the start date', () => {
    expect(
      nextOccurrence({ ...base, interval: 3 }, new Date('2026-01-05T12:00:00Z'))?.toISOString(),
    ).toBe('2026-01-07T09:30:00.000Z');
  });

  test('supports selected weekdays in anchored week intervals', () => {
    const rule: RecurrenceRule = {
      ...base,
      frequency: 'weekly',
      interval: 2,
      startDate: '2026-01-07',
      weekdays: [1, 5],
    };
    expect(nextOccurrence(rule, new Date('2026-01-07T10:00:00Z'))?.toISOString()).toBe(
      '2026-01-09T09:30:00.000Z',
    );
    expect(nextOccurrence(rule, new Date('2026-01-09T10:00:00Z'))?.toISOString()).toBe(
      '2026-01-19T09:30:00.000Z',
    );
  });

  test('clamps monthly schedules to each month end', () => {
    const rule = { ...base, frequency: 'monthly' as const, dayOfMonth: 31 };
    expect(nextOccurrence(rule, new Date('2026-01-31T10:00:00Z'))?.toISOString()).toBe(
      '2026-02-28T09:30:00.000Z',
    );
    expect(nextOccurrence(rule, new Date('2026-02-28T10:00:00Z'))?.toISOString()).toBe(
      '2026-03-31T09:30:00.000Z',
    );
  });

  test('clamps leap-day yearly schedules in non-leap years', () => {
    const rule = {
      ...base,
      frequency: 'yearly' as const,
      startDate: '2024-02-29',
      month: 2,
      dayOfMonth: 29,
    };
    expect(nextOccurrence(rule, new Date('2024-03-01T00:00:00Z'))?.toISOString()).toBe(
      '2025-02-28T09:30:00.000Z',
    );
  });

  test('uses compatible DST gap and overlap disambiguation', () => {
    const gap = {
      ...base,
      startDate: '2026-03-08',
      time: '02:30',
      timezone: 'America/New_York',
    };
    expect(nextOccurrence(gap, new Date('2026-03-08T00:00:00Z'))?.toISOString()).toBe(
      '2026-03-08T07:30:00.000Z',
    );

    const overlap = { ...gap, startDate: '2026-11-01', time: '01:30' };
    expect(nextOccurrence(overlap, new Date('2026-11-01T00:00:00Z'))?.toISOString()).toBe(
      '2026-11-01T05:30:00.000Z',
    );
  });

  test('returns null beyond the inclusive end date', () => {
    expect(
      nextOccurrence({ ...base, endDate: '2026-01-02' }, new Date('2026-01-02T10:00:00Z')),
    ).toBeNull();
  });
});

describe('validateRecurrenceRule', () => {
  test('rejects invalid timezone and schedule-specific fields', () => {
    expect(() => validateRecurrenceRule({ ...base, timezone: 'Nowhere/Invalid' })).toThrow();
    expect(() => validateRecurrenceRule({ ...base, frequency: 'weekly', weekdays: [] })).toThrow();
    expect(() =>
      validateRecurrenceRule({ ...base, frequency: 'monthly', dayOfMonth: 32 }),
    ).toThrow();
  });
});

test('derives offset issue dates in the recurrence timezone', () => {
  expect(localDateForInstant(new Date('2026-01-02T01:00:00Z'), 'America/Los_Angeles', 2)).toBe(
    '2026-01-03',
  );
});
