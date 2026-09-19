import { beforeEach, describe, expect, it } from 'bun:test';
import { authedApi, type Api } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { addProjectMember } from '#tests/helpers/members';
import { createRole } from '#tests/helpers/roles';
import { db, issueFieldValue, recurringIssue, recurringIssueOccurrence } from '@repo/db';
import { eq } from 'drizzle-orm';
import { processRecurringIssueOccurrences } from '../../materialize';

function recurring(client: Api, projectKey = 'MKT') {
  return client.projects({ projectKey })['recurring-issues'];
}

async function setup() {
  const owner = await signUpTestUser();
  const client = authedApi(owner.cookie);
  await client.projects.post({ key: 'MKT', name: 'Marketing' });
  const project = (await client.projects({ projectKey: 'MKT' }).get()).data!;
  return { client, columnId: project.columns[0].id };
}

function input(columnId: number) {
  return {
    name: 'Weekly planning',
    frequency: 'weekly' as const,
    interval: 1,
    weekdays: [1, 3],
    startDate: '2026-01-01',
    localTime: '09:00',
    timezone: 'America/New_York',
    title: 'Plan the week',
    description: 'Review active work.',
    columnId,
    startOffsetDays: 0,
    dueOffsetDays: 2,
  };
}

describe('recurring issues', () => {
  beforeEach(resetDb);

  it('creates, lists, updates, pauses, resumes, and cancels a recurring issue', async () => {
    const { client, columnId } = await setup();
    const created = await recurring(client).post(input(columnId));
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      name: 'Weekly planning',
      status: 'active',
      weekdays: [1, 3],
      timezone: 'America/New_York',
      occurrenceCount: 0,
      columnId,
    });

    const id = created.data!.id;
    const listed = await recurring(client).get({ query: { page: 1, pageSize: 10 } });
    expect(listed.data).toMatchObject({ total: 1, items: [{ id }] });

    const propertyOnly = await recurring(client)({ recurringIssueId: id }).patch({
      title: 'Updated title',
    });
    expect(new Date(propertyOnly.data!.nextRunAt!).getTime()).toBe(
      new Date(created.data!.nextRunAt!).getTime(),
    );

    const updated = await recurring(client)({ recurringIssueId: id }).patch({
      interval: 2,
    });
    expect(updated.data).toMatchObject({ title: 'Updated title', interval: 2 });

    expect((await recurring(client)({ recurringIssueId: id }).pause.post()).data?.status).toBe(
      'paused',
    );
    expect((await recurring(client)({ recurringIssueId: id }).resume.post()).data?.status).toBe(
      'active',
    );
    expect((await recurring(client)({ recurringIssueId: id }).cancel.post()).data?.status).toBe(
      'cancelled',
    );
    expect((await recurring(client)({ recurringIssueId: id }).resume.post()).status).toBe(409);
  });

  it('validates schedule fields and project references', async () => {
    const { client, columnId } = await setup();
    expect(
      (
        await recurring(client).post({
          ...input(columnId),
          weekdays: [],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await recurring(client).post({
          ...input(columnId),
          name: 'Bad timezone',
          timezone: 'Nowhere/Invalid',
        })
      ).status,
    ).toBe(400);

    await client.projects.post({ key: 'OPS', name: 'Operations' });
    const other = (await client.projects({ projectKey: 'OPS' }).get()).data!;
    expect(
      (
        await recurring(client).post({
          ...input(other.columns[0].id),
          name: 'Cross project',
        })
      ).status,
    ).toBe(400);
  });

  it('rejects duplicate names and isolates projects', async () => {
    const { client, columnId } = await setup();
    await recurring(client).post(input(columnId));
    expect((await recurring(client).post(input(columnId))).status).toBe(409);
    await client.projects.post({ key: 'OPS', name: 'Operations' });
    expect((await recurring(client, 'OPS').get({ query: {} })).data?.total).toBe(0);
  });

  it('allows readers to inspect definitions but denies mutations', async () => {
    const { client, columnId } = await setup();
    const template = (await recurring(client).post(input(columnId))).data!;
    const role = await createRole(client, 'MKT', {
      name: 'Recurring reader',
      permissions: { recurring_issues: { read: true } },
    });
    const reader = await addProjectMember(client, 'MKT', role.data!.id);

    expect((await recurring(reader).get({ query: {} })).status).toBe(200);
    expect((await recurring(reader).post(input(columnId))).status).toBe(403);
    expect((await recurring(reader)({ recurringIssueId: template.id }).pause.post()).status).toBe(
      403,
    );
    expect((await recurring(reader)({ recurringIssueId: template.id }).cancel.post()).status).toBe(
      403,
    );
  });

  it('materializes one independent issue with immutable origin identity', async () => {
    const { client, columnId } = await setup();
    const template = (await recurring(client).post(input(columnId))).data!;
    const scheduledFor = new Date('2026-02-02T14:00:00Z');
    await db.insert(recurringIssueOccurrence).values({
      recurringIssueId: template.id,
      scheduledFor,
    });

    await Promise.all([processRecurringIssueOccurrences(), processRecurringIssueOccurrences()]);

    const board = (await client.projects({ projectKey: 'MKT' }).issues.get()).data!;
    expect(board).toHaveLength(1);
    const detail = (await client.issues({ issueId: board[0].id }).get()).data!;
    expect(detail).toMatchObject({
      title: 'Plan the week',
      recurrenceOrigin: {
        recurringIssueId: template.id,
        name: 'Weekly planning',
      },
    });
    expect(new Date(detail.startDate as string).toISOString().slice(0, 10)).toBe('2026-02-02');
    expect(new Date(detail.dueDate as string).toISOString().slice(0, 10)).toBe('2026-02-04');
    const occurrences = await recurring(client)({ recurringIssueId: template.id }).occurrences.get({
      query: {},
    });
    expect(occurrences.data?.items).toMatchObject([{ status: 'created', issueId: board[0].id }]);

    await recurring(client)({ recurringIssueId: template.id }).cancel.post();
    await client.issues({ issueId: board[0].id }).patch({ title: 'Independent issue' });
    const changed = (await client.issues({ issueId: board[0].id }).get()).data!;
    const cancelled = (await recurring(client)({ recurringIssueId: template.id }).get()).data!;
    expect(changed).toMatchObject({
      title: 'Independent issue',
      recurrenceOrigin: { status: 'cancelled' },
    });
    expect(cancelled.title).toBe('Plan the week');
  });

  it('copies applicable custom-field values into the generated issue', async () => {
    const { client, columnId } = await setup();
    const field = (
      await client
        .projects({ projectKey: 'MKT' })
        ['custom-fields'].post({ name: 'Region', fieldType: 'text' })
    ).data!;
    const template = (
      await recurring(client).post({
        ...input(columnId),
        fieldValues: [{ fieldId: field.id, value: 'EMEA' }],
      })
    ).data!;
    await db.insert(recurringIssueOccurrence).values({
      recurringIssueId: template.id,
      scheduledFor: new Date('2026-02-02T14:00:00Z'),
    });

    await processRecurringIssueOccurrences();

    const board = (await client.projects({ projectKey: 'MKT' }).issues.get()).data!;
    const detail = (await client.issues({ issueId: board[0].id }).get()).data!;
    const stored = await db
      .select()
      .from(issueFieldValue)
      .where(eq(issueFieldValue.issueId, board[0].id));
    expect(template.fieldValues).toEqual([
      { fieldId: field.id, value: 'EMEA', valueEnd: null, optionIds: [] },
    ]);
    expect(stored).toHaveLength(1);
    expect(detail.fieldValues).toMatchObject([{ fieldId: field.id, value: 'EMEA' }]);
  });

  it('fails and pauses when the required column was deleted', async () => {
    const { client } = await setup();
    const column = (
      await client
        .projects({ projectKey: 'MKT' })
        .columns.post({ name: 'In progress', stateType: 'started' })
    ).data!;
    const template = (await recurring(client).post(input(column.id))).data!;
    const removed = await client
      .projects({ projectKey: 'MKT' })
      .columns({ columnId: column.id })
      .delete({ mode: 'delete' });
    expect(removed.status).toBe(204);
    expect((await recurring(client)({ recurringIssueId: template.id }).get()).data?.status).toBe(
      'paused',
    );
    await db
      .update(recurringIssue)
      .set({ status: 'active', nextRunAt: new Date('2026-02-02T14:00:00Z') })
      .where(eq(recurringIssue.id, template.id));
    await db.insert(recurringIssueOccurrence).values({
      recurringIssueId: template.id,
      scheduledFor: new Date('2026-02-02T14:00:00Z'),
    });

    await processRecurringIssueOccurrences();

    const definition = await recurring(client)({ recurringIssueId: template.id }).get();
    const occurrences = await recurring(client)({ recurringIssueId: template.id }).occurrences.get({
      query: {},
    });
    expect(definition.data?.status).toBe('paused');
    expect(occurrences.data?.items).toMatchObject([
      { status: 'failed', lastError: 'Recurring issue column no longer exists' },
    ]);
  });
});
