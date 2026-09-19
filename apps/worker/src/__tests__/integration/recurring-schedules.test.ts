import { describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import {
  db,
  project,
  projectColumn,
  recurringIssue,
  recurringIssueOccurrence,
  team,
} from '@repo/db';
import { eq } from 'drizzle-orm';
import { enqueueDueRecurringIssues } from '../../recurring-schedules';

async function makeRecurring(status: 'active' | 'paused' = 'active') {
  const [owner] = await db.insert(team).values({ name: 'Recurring' }).returning({ id: team.id });
  const [projectRow] = await db
    .insert(project)
    .values({ teamId: owner.id, key: randomUUID().slice(0, 8), name: 'Project' })
    .returning({ id: project.id });
  const [column] = await db
    .insert(projectColumn)
    .values({ projectId: projectRow.id, name: 'Todo', position: 0 })
    .returning({ id: projectColumn.id });
  const [recurring] = await db
    .insert(recurringIssue)
    .values({
      projectId: projectRow.id,
      name: randomUUID(),
      status,
      frequency: 'daily',
      interval: 1,
      startDate: '2026-01-01',
      localTime: '09:00',
      timezone: 'UTC',
      nextRunAt: new Date(Date.now() - 60_000),
      title: 'Daily issue',
      columnId: column.id,
    })
    .returning({ id: recurringIssue.id });
  return recurring.id;
}

describe('enqueueDueRecurringIssues', () => {
  it('queues one overdue occurrence and advances beyond the current time', async () => {
    const id = await makeRecurring();
    await Promise.all([enqueueDueRecurringIssues(), enqueueDueRecurringIssues()]);

    const occurrences = await db
      .select()
      .from(recurringIssueOccurrence)
      .where(eq(recurringIssueOccurrence.recurringIssueId, id));
    const [definition] = await db.select().from(recurringIssue).where(eq(recurringIssue.id, id));
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].status).toBe('pending');
    expect(definition.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not queue a paused definition', async () => {
    const id = await makeRecurring('paused');
    await enqueueDueRecurringIssues();
    const occurrences = await db
      .select()
      .from(recurringIssueOccurrence)
      .where(eq(recurringIssueOccurrence.recurringIssueId, id));
    expect(occurrences).toHaveLength(0);
  });
});
