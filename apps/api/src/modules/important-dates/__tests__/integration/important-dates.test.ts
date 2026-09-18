import { beforeEach, describe, expect, it } from 'bun:test';
import { addProjectMember } from '#tests/helpers/members';
import { authedApi, type Api } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { createRole } from '#tests/helpers/roles';

async function setup() {
  const owner = await signUpTestUser();
  const asOwner = authedApi(owner.cookie);
  await asOwner.projects.post({ key: 'MKT', name: 'Marketing' });
  return { asOwner };
}

const importantDates = (client: Api, projectKey = 'MKT') =>
  client.projects({ projectKey })['important-dates'];

function createImportantDate(
  client: Api,
  body: { name?: string; date?: string; showOnTimeline?: boolean } = {},
  projectKey = 'MKT',
) {
  return importantDates(client, projectKey).post({
    name: body.name ?? 'Launch',
    date: body.date ?? '2026-10-15',
    ...(body.showOnTimeline === undefined ? {} : { showOnTimeline: body.showOnTimeline }),
  });
}

function dateOnly(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

describe('important dates', () => {
  beforeEach(resetDb);

  it('starts empty and supports create, update, visibility toggle, and delete', async () => {
    const { asOwner } = await setup();
    expect((await importantDates(asOwner).get()).data).toEqual([]);

    const created = await createImportantDate(asOwner, {
      name: '  Public launch  ',
      showOnTimeline: false,
    });
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      name: 'Public launch',
      showOnTimeline: false,
    });
    expect(dateOnly(created.data!.date)).toBe('2026-10-15');

    const updated = await asOwner['important-dates']({
      importantDateId: created.data!.id,
    }).patch({ name: 'General availability', date: '2026-10-20', showOnTimeline: true });
    expect(updated.status).toBe(200);
    expect(updated.data).toMatchObject({
      name: 'General availability',
      showOnTimeline: true,
    });
    expect(dateOnly(updated.data!.date)).toBe('2026-10-20');

    expect(
      (await asOwner['important-dates']({ importantDateId: created.data!.id }).delete()).status,
    ).toBe(204);
    expect((await importantDates(asOwner).get()).data).toEqual([]);
  });

  it('lists dates chronologically and uses id as the equal-date tie-breaker', async () => {
    const { asOwner } = await setup();
    const later = await createImportantDate(asOwner, { name: 'Later', date: '2026-12-01' });
    const firstSameDay = await createImportantDate(asOwner, {
      name: 'First same day',
      date: '2026-11-01',
    });
    const secondSameDay = await createImportantDate(asOwner, {
      name: 'Second same day',
      date: '2026-11-01',
    });

    const list = await importantDates(asOwner).get();
    expect(list.data!.map((date) => date.id)).toEqual([
      firstSameDay.data!.id,
      secondSameDay.data!.id,
      later.data!.id,
    ]);
  });

  it('rejects empty and over-limit names after trimming', async () => {
    const { asOwner } = await setup();
    expect((await createImportantDate(asOwner, { name: '   ' })).status).toBe(400);
    expect((await createImportantDate(asOwner, { name: ` ${'x'.repeat(201)} ` })).status).toBe(400);
    expect((await createImportantDate(asOwner, { name: ` ${'x'.repeat(200)} ` })).status).toBe(201);
  });

  it('validates names on update', async () => {
    const { asOwner } = await setup();
    const created = (await createImportantDate(asOwner)).data!;

    expect(
      (await asOwner['important-dates']({ importantDateId: created.id }).patch({ name: '   ' }))
        .status,
    ).toBe(400);
    expect(
      (
        await asOwner['important-dates']({ importantDateId: created.id }).patch({
          name: 'x'.repeat(201),
        })
      ).status,
    ).toBe(400);
  });

  it('rejects malformed and impossible dates', async () => {
    const { asOwner } = await setup();
    expect((await createImportantDate(asOwner, { date: '15.10.2026' })).status).toBe(400);
    expect((await createImportantDate(asOwner, { date: '2026-02-30' })).status).toBe(400);
  });

  it('returns 404 for unknown ids', async () => {
    const { asOwner } = await setup();
    expect(
      (await asOwner['important-dates']({ importantDateId: 999999 }).patch({ name: 'Missing' }))
        .status,
    ).toBe(404);
    expect((await asOwner['important-dates']({ importantDateId: 999999 }).delete()).status).toBe(
      404,
    );
  });

  it('lets a work-item reader list dates but denies mutations without workflow edit', async () => {
    const { asOwner } = await setup();
    const created = (await createImportantDate(asOwner)).data!;
    const role = await createRole(asOwner, 'MKT', {
      name: 'Reader',
      permissions: { work_items: { read: true } },
    });
    const reader = await addProjectMember(asOwner, 'MKT', role.data!.id);

    expect((await importantDates(reader).get()).status).toBe(200);
    expect((await createImportantDate(reader)).status).toBe(403);
    expect(
      (await reader['important-dates']({ importantDateId: created.id }).patch({ name: 'Nope' }))
        .status,
    ).toBe(403);
    expect((await reader['important-dates']({ importantDateId: created.id }).delete()).status).toBe(
      403,
    );
  });

  it('resolves entity permissions from the owning project', async () => {
    const { asOwner } = await setup();
    const role = await createRole(asOwner, 'MKT', {
      name: 'Configuration editor',
      permissions: { work_items: { read: true }, workflow_config: { edit: true } },
    });
    const editor = await addProjectMember(asOwner, 'MKT', role.data!.id);
    await asOwner.projects.post({ key: 'OPS', name: 'Operations' });
    const foreign = (await createImportantDate(asOwner, {}, 'OPS')).data!;

    expect(
      (await editor['important-dates']({ importantDateId: foreign.id }).patch({ name: 'Nope' }))
        .status,
    ).toBe(403);
    expect((await editor['important-dates']({ importantDateId: foreign.id }).delete()).status).toBe(
      403,
    );
    expect((await importantDates(asOwner, 'OPS').get()).data![0].name).toBe('Launch');
  });

  it('denies an outsider on project and entity routes', async () => {
    const { asOwner } = await setup();
    const created = (await createImportantDate(asOwner)).data!;
    const outsider = authedApi((await signUpTestUser()).cookie);

    expect((await importantDates(outsider).get()).status).toBe(403);
    expect((await createImportantDate(outsider)).status).toBe(403);
    expect(
      (await outsider['important-dates']({ importantDateId: created.id }).patch({ name: 'Nope' }))
        .status,
    ).toBe(403);
    expect(
      (await outsider['important-dates']({ importantDateId: created.id }).delete()).status,
    ).toBe(403);
  });

  it('cascades dates when their project is deleted', async () => {
    const { asOwner } = await setup();
    const created = (await createImportantDate(asOwner)).data!;

    expect((await asOwner.projects({ projectKey: 'MKT' }).delete()).status).toBe(204);
    expect(
      (await asOwner['important-dates']({ importantDateId: created.id }).patch({ name: 'Missing' }))
        .status,
    ).toBe(404);
  });
});
