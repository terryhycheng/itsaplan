import { db, issue, recurringIssue, recurringIssueLabel, recurringIssueOccurrence } from '@repo/db';
import { localDateForInstant } from '@repo/recurrence';
import { and, eq, sql } from 'drizzle-orm';
import { createIssue } from '#modules/issues/service';
import { getProjectById } from '#modules/projects/service';
import { HttpError, intEnv, pgErrorCode } from '#shared/lib';
import { listRecurringIssueFieldValues } from './service';

export const recurringIssueRunConfig = {
  pollIntervalMs: () => intEnv('RECURRING_ISSUE_RUN_POLL_INTERVAL_MS', 2000),
  batchSize: () => intEnv('RECURRING_ISSUE_RUN_BATCH_SIZE', 5),
  maxAttempts: () => intEnv('RECURRING_ISSUE_RUN_MAX_ATTEMPTS', 3),
  leaseSeconds: () => intEnv('RECURRING_ISSUE_RUN_LEASE_SECONDS', 120),
};

interface ClaimedOccurrence {
  id: number;
  recurringIssueId: number;
  scheduledFor: Date;
  attempts: number;
}

export async function claimRecurringIssueOccurrences(): Promise<ClaimedOccurrence[]> {
  const rows = await db.execute(sql`
    UPDATE recurring_issue_occurrence o
    SET attempts = o.attempts + 1,
        next_attempt_at = now() + make_interval(secs => ${recurringIssueRunConfig.leaseSeconds()})
    WHERE o.id IN (
      SELECT id FROM recurring_issue_occurrence q
      WHERE q.status = 'pending' AND q.next_attempt_at <= now()
      ORDER BY q.next_attempt_at, q.id
      FOR UPDATE SKIP LOCKED
      LIMIT ${recurringIssueRunConfig.batchSize()}
    )
    RETURNING o.id, o.recurring_issue_id AS "recurringIssueId",
              o.scheduled_for AS "scheduledFor", o.attempts
  `);
  return (
    rows as unknown as (Omit<ClaimedOccurrence, 'scheduledFor'> & { scheduledFor: string | Date })[]
  ).map((row) => ({
    ...row,
    scheduledFor: row.scheduledFor instanceof Date ? row.scheduledFor : new Date(row.scheduledFor),
  }));
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function finishOccurrence(
  tx: Transaction,
  occurrenceId: number,
  issueId: number,
): Promise<void> {
  const [completed] = await tx
    .update(recurringIssueOccurrence)
    .set({ status: 'created', issueId, lastError: null, finishedAt: new Date() })
    .where(
      and(
        eq(recurringIssueOccurrence.id, occurrenceId),
        eq(recurringIssueOccurrence.status, 'pending'),
      ),
    )
    .returning({ recurringIssueId: recurringIssueOccurrence.recurringIssueId });
  if (!completed) return;
  await tx.execute(sql`
      UPDATE recurring_issue
      SET occurrence_count = occurrence_count + 1,
          status = CASE
            WHEN status = 'active' AND (
              (max_occurrences IS NOT NULL AND occurrence_count + 1 >= max_occurrences)
              OR next_run_at IS NULL
            ) THEN 'completed'
            ELSE status
          END,
          updated_at = now()
      WHERE id = ${completed.recurringIssueId}
  `);
}

async function skipOccurrence(tx: Transaction, id: number): Promise<void> {
  await tx
    .update(recurringIssueOccurrence)
    .set({ status: 'skipped', finishedAt: new Date() })
    .where(
      and(eq(recurringIssueOccurrence.id, id), eq(recurringIssueOccurrence.status, 'pending')),
    );
}

async function failOccurrence(
  occurrence: ClaimedOccurrence,
  error: unknown,
  permanent: boolean,
): Promise<void> {
  const message = error instanceof Error ? error.message : 'Recurring issue generation failed';
  if (!permanent && occurrence.attempts < recurringIssueRunConfig.maxAttempts()) {
    const delaySeconds = Math.min(300, 2 ** occurrence.attempts * 5);
    await db
      .update(recurringIssueOccurrence)
      .set({
        nextAttemptAt: sql`now() + make_interval(secs => ${delaySeconds})`,
        lastError: message.slice(0, 500),
      })
      .where(
        and(
          eq(recurringIssueOccurrence.id, occurrence.id),
          eq(recurringIssueOccurrence.status, 'pending'),
        ),
      );
    return;
  }
  await db.transaction(async (tx) => {
    const [failed] = await tx
      .update(recurringIssueOccurrence)
      .set({ status: 'failed', lastError: message.slice(0, 500), finishedAt: new Date() })
      .where(
        and(
          eq(recurringIssueOccurrence.id, occurrence.id),
          eq(recurringIssueOccurrence.status, 'pending'),
        ),
      )
      .returning({ recurringIssueId: recurringIssueOccurrence.recurringIssueId });
    if (failed) {
      await tx
        .update(recurringIssue)
        .set({ status: 'paused', nextRunAt: null, updatedAt: new Date() })
        .where(
          and(eq(recurringIssue.id, failed.recurringIssueId), eq(recurringIssue.status, 'active')),
        );
    }
  });
}

export async function materializeRecurringIssueOccurrence(
  occurrence: ClaimedOccurrence,
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const [template] = await tx
        .select()
        .from(recurringIssue)
        .where(eq(recurringIssue.id, occurrence.recurringIssueId))
        .for('no key update');
      if (!template || template.status !== 'active') {
        await skipOccurrence(tx, occurrence.id);
        return;
      }
      if (template.columnId == null) {
        throw new HttpError(409, 'Recurring issue column no longer exists');
      }
      const [existing] = await tx
        .select({ id: issue.id })
        .from(issue)
        .where(
          and(
            eq(issue.recurringIssueId, template.id),
            eq(issue.recurrenceScheduledFor, occurrence.scheduledFor),
          ),
        );
      if (existing) {
        await finishOccurrence(tx, occurrence.id, existing.id);
        return;
      }
      const project = await getProjectById(template.projectId);
      if (!project) {
        await skipOccurrence(tx, occurrence.id);
        return;
      }
      const labels = await tx
        .select({ id: recurringIssueLabel.labelId })
        .from(recurringIssueLabel)
        .where(eq(recurringIssueLabel.recurringIssueId, template.id));
      const fieldValues = await listRecurringIssueFieldValues(template.id);
      try {
        const created = await createIssue(
          project,
          {
            title: template.title,
            description: template.description,
            columnId: template.columnId,
            typeId: template.typeId,
            initiativeId: template.initiativeId,
            assigneeUserId: template.assigneeUserId,
            delegateUserId: template.delegateUserId,
            priority: template.priority,
            estimatePoints:
              template.estimatePoints == null ? null : Number(template.estimatePoints),
            estimateMinutes: template.estimateMinutes,
            startDate:
              template.startOffsetDays == null
                ? null
                : localDateForInstant(
                    occurrence.scheduledFor,
                    template.timezone,
                    template.startOffsetDays,
                  ),
            dueDate:
              template.dueOffsetDays == null
                ? null
                : localDateForInstant(
                    occurrence.scheduledFor,
                    template.timezone,
                    template.dueOffsetDays,
                  ),
            labelIds: labels.map((row) => row.id),
            fieldValues,
            recurringOrigin: {
              recurringIssueId: template.id,
              scheduledFor: occurrence.scheduledFor,
            },
          },
          { system: 'Recurring issue' },
        );
        await finishOccurrence(tx, occurrence.id, created.id);
      } catch (error) {
        if (pgErrorCode(error) !== '23505') throw error;
        const [duplicate] = await tx
          .select({ id: issue.id })
          .from(issue)
          .where(
            and(
              eq(issue.recurringIssueId, template.id),
              eq(issue.recurrenceScheduledFor, occurrence.scheduledFor),
            ),
          );
        if (!duplicate) throw error;
        await finishOccurrence(tx, occurrence.id, duplicate.id);
      }
    });
  } catch (error) {
    await failOccurrence(occurrence, error, error instanceof HttpError && error.status < 500);
  }
}

export async function processRecurringIssueOccurrences(): Promise<void> {
  const occurrences = await claimRecurringIssueOccurrences();
  await Promise.all(occurrences.map(materializeRecurringIssueOccurrence));
}
