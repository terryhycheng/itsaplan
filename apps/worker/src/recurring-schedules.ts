import { db, recurringIssue, recurringIssueOccurrence } from '@repo/db';
import { nextOccurrence, type RecurrenceFrequency } from '@repo/recurrence';
import { eq, sql } from 'drizzle-orm';
import { intEnv } from './env';
import { parseScheduleTimestamp } from './schedule-timestamp';

interface DueRecurringIssue {
  id: number;
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: number[] | null;
  dayOfMonth: number | null;
  month: number | null;
  startDate: string;
  localTime: string;
  timezone: string;
  endDate: string | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
  nextRunAt: string;
}

export async function enqueueDueRecurringIssues(): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT id, frequency, interval, weekdays, day_of_month AS "dayOfMonth",
             month, start_date AS "startDate", local_time AS "localTime", timezone,
             end_date AS "endDate", max_occurrences AS "maxOccurrences",
             occurrence_count AS "occurrenceCount", next_run_at AS "nextRunAt"
      FROM recurring_issue r
      WHERE status = 'active' AND next_run_at <= now()
        AND NOT EXISTS (
          SELECT 1 FROM recurring_issue_occurrence o
          WHERE o.recurring_issue_id = r.id AND o.status = 'pending'
        )
      ORDER BY next_run_at, id
      FOR UPDATE SKIP LOCKED
       LIMIT ${intEnv('RECURRING_ISSUE_SCHEDULE_BATCH_SIZE', 50)}
    `)) as unknown as DueRecurringIssue[];

    for (const row of rows) {
      const scheduledFor = parseScheduleTimestamp(row.nextRunAt);
      if (row.maxOccurrences != null && row.occurrenceCount >= row.maxOccurrences) {
        await tx
          .update(recurringIssue)
          .set({ status: 'completed', nextRunAt: null, updatedAt: new Date() })
          .where(eq(recurringIssue.id, row.id));
        continue;
      }

      let next: Date | null;
      try {
        next = nextOccurrence(
          {
            frequency: row.frequency,
            interval: row.interval,
            weekdays: row.weekdays,
            dayOfMonth: row.dayOfMonth,
            month: row.month,
            startDate: row.startDate,
            time: row.localTime,
            timezone: row.timezone,
            endDate: row.endDate,
          },
          new Date(),
        );
      } catch {
        next = null;
      }

      await tx
        .insert(recurringIssueOccurrence)
        .values({ recurringIssueId: row.id, scheduledFor })
        .onConflictDoNothing();
      await tx
        .update(recurringIssue)
        .set({ nextRunAt: next, lastRunAt: scheduledFor, updatedAt: new Date() })
        .where(eq(recurringIssue.id, row.id));
    }
  });
}
