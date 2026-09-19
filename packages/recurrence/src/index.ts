import { Temporal } from '@js-temporal/polyfill';

export const recurrenceFrequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export type RecurrenceFrequency = (typeof recurrenceFrequencies)[number];

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: number[] | null;
  dayOfMonth?: number | null;
  month?: number | null;
  startDate: string;
  time: string;
  timezone: string;
  endDate?: string | null;
}

function plainDate(value: string, field: string): Temporal.PlainDate {
  try {
    const date = Temporal.PlainDate.from(value);
    if (date.toString() !== value) throw new RangeError();
    return date;
  } catch {
    throw new RangeError(`${field} must be a valid ISO date`);
  }
}

function plainTime(value: string): Temporal.PlainTime {
  if (!/^\d{2}:\d{2}$/.test(value)) throw new RangeError('time must use HH:mm');
  try {
    const time = Temporal.PlainTime.from(value);
    if (time.second !== 0 || time.millisecond !== 0) throw new RangeError();
    return time;
  } catch {
    throw new RangeError('time must be a valid local time');
  }
}

export function validateRecurrenceRule(rule: RecurrenceRule): void {
  if (!recurrenceFrequencies.includes(rule.frequency)) {
    throw new RangeError('frequency is invalid');
  }
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 100) {
    throw new RangeError('interval must be between 1 and 100');
  }

  const start = plainDate(rule.startDate, 'startDate');
  const end = rule.endDate ? plainDate(rule.endDate, 'endDate') : null;
  plainTime(rule.time);
  try {
    Temporal.Now.zonedDateTimeISO(rule.timezone);
  } catch {
    throw new RangeError('timezone must be a valid IANA timezone');
  }
  if (end && Temporal.PlainDate.compare(end, start) < 0) {
    throw new RangeError('endDate must not be before startDate');
  }

  if (rule.frequency === 'weekly') {
    const weekdays = [...new Set(rule.weekdays ?? [])];
    if (
      weekdays.length === 0 ||
      weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)
    ) {
      throw new RangeError('weekly rules require weekdays between 1 and 7');
    }
  } else if (rule.weekdays?.length) {
    throw new RangeError('weekdays are only valid for weekly rules');
  }

  if (rule.frequency === 'monthly') {
    if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth! < 1 || rule.dayOfMonth! > 31) {
      throw new RangeError('monthly rules require a day between 1 and 31');
    }
  } else if (rule.frequency === 'yearly') {
    if (!Number.isInteger(rule.month) || rule.month! < 1 || rule.month! > 12) {
      throw new RangeError('yearly rules require a month between 1 and 12');
    }
    if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth! < 1 || rule.dayOfMonth! > 31) {
      throw new RangeError('yearly rules require a day between 1 and 31');
    }
  } else if (rule.dayOfMonth != null || rule.month != null) {
    throw new RangeError('calendar day and month do not apply to this frequency');
  }
  if (rule.frequency !== 'yearly' && rule.month != null) {
    throw new RangeError('month is only valid for yearly rules');
  }
}

function scheduledInstant(date: Temporal.PlainDate, rule: RecurrenceRule): Temporal.Instant {
  return date
    .toPlainDateTime(plainTime(rule.time))
    .toZonedDateTime(rule.timezone, { disambiguation: 'compatible' })
    .toInstant();
}

function clampedDate(year: number, month: number, day: number): Temporal.PlainDate {
  const first = Temporal.PlainDate.from({ year, month, day: 1 });
  return first.with({ day: Math.min(day, first.daysInMonth) });
}

export function nextOccurrence(
  rule: RecurrenceRule,
  after: Date,
  options: { inclusive?: boolean } = {},
): Date | null {
  validateRecurrenceRule(rule);
  const start = plainDate(rule.startDate, 'startDate');
  const end = rule.endDate ? plainDate(rule.endDate, 'endDate') : null;
  const threshold = Temporal.Instant.from(after.toISOString());
  const localAfter = threshold.toZonedDateTimeISO(rule.timezone).toPlainDate();
  const accepts = (date: Temporal.PlainDate) => {
    if (
      Temporal.PlainDate.compare(date, start) < 0 ||
      (end && Temporal.PlainDate.compare(date, end) > 0)
    ) {
      return false;
    }
    const comparison = Temporal.Instant.compare(scheduledInstant(date, rule), threshold);
    return options.inclusive ? comparison >= 0 : comparison > 0;
  };
  const result = (date: Temporal.PlainDate) =>
    new Date(scheduledInstant(date, rule).epochMilliseconds);

  if (rule.frequency === 'daily') {
    const elapsed = Math.max(0, start.until(localAfter, { largestUnit: 'days' }).days);
    let date = start.add({ days: Math.floor(elapsed / rule.interval) * rule.interval });
    if (!accepts(date)) date = date.add({ days: rule.interval });
    return !end || Temporal.PlainDate.compare(date, end) <= 0 ? result(date) : null;
  }

  if (rule.frequency === 'weekly') {
    const anchorWeek = start.subtract({ days: start.dayOfWeek - 1 });
    const afterWeek = localAfter.subtract({ days: localAfter.dayOfWeek - 1 });
    const elapsedWeeks = Math.max(
      0,
      Math.floor(anchorWeek.until(afterWeek, { largestUnit: 'days' }).days / 7),
    );
    let cycle = Math.floor(elapsedWeeks / rule.interval);
    const weekdays = [...new Set(rule.weekdays!)].sort((a, b) => a - b);
    for (;;) {
      const week = anchorWeek.add({ weeks: cycle * rule.interval });
      for (const weekday of weekdays) {
        const date = week.add({ days: weekday - 1 });
        if (accepts(date)) return result(date);
      }
      cycle += 1;
      const nextWeek = anchorWeek.add({ weeks: cycle * rule.interval });
      if (end && Temporal.PlainDate.compare(nextWeek, end) > 0) return null;
    }
  }

  if (rule.frequency === 'monthly') {
    const elapsedMonths = Math.max(
      0,
      (localAfter.year - start.year) * 12 + localAfter.month - start.month,
    );
    let cycle = Math.floor(elapsedMonths / rule.interval);
    for (;;) {
      const month = start.with({ day: 1 }).add({ months: cycle * rule.interval });
      const date = clampedDate(month.year, month.month, rule.dayOfMonth!);
      if (accepts(date)) return result(date);
      cycle += 1;
      if (end && Temporal.PlainDate.compare(month.add({ months: rule.interval }), end) > 0)
        return null;
    }
  }

  const elapsedYears = Math.max(0, localAfter.year - start.year);
  let cycle = Math.floor(elapsedYears / rule.interval);
  for (;;) {
    const year = start.year + cycle * rule.interval;
    const date = clampedDate(year, rule.month!, rule.dayOfMonth!);
    if (accepts(date)) return result(date);
    cycle += 1;
    if (end && year + rule.interval > end.year) return null;
  }
}

export function localDateForInstant(instant: Date, timezone: string, offsetDays = 0): string {
  try {
    return Temporal.Instant.from(instant.toISOString())
      .toZonedDateTimeISO(timezone)
      .toPlainDate()
      .add({ days: offsetDays })
      .toString();
  } catch {
    throw new RangeError('timezone must be a valid IANA timezone');
  }
}
