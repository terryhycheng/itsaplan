import { beforeEach, describe, expect, it } from 'bun:test';
import { authedApi, type Api } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { addProjectMember } from '#tests/helpers/members';
import { createRole } from '#tests/helpers/roles';

async function setup() {
  const owner = await signUpTestUser();
  const asOwner = authedApi(owner.cookie);
  await asOwner.projects.post({ key: 'MKT', name: 'Marketing' });
  const project = (await asOwner.projects({ projectKey: 'MKT' }).get()).data!;
  const issue = (
    await asOwner.projects({ projectKey: 'MKT' }).issues.post({
      columnId: project.columns[0].id,
      title: 'Task',
    })
  ).data!;
  return { asOwner, issueId: issue.id };
}

const usefulLinks = (client: Api, issueId: number) => client.issues({ issueId })['useful-links'];

function createUsefulLink(client: Api, issueId: number, url = 'https://example.com/docs') {
  return usefulLinks(client, issueId).post({ url });
}

async function revision(client: Api, issueId: number): Promise<string> {
  const result = await client.sync.rev.get({ query: { scopes: `issue:${issueId}` } });
  expect(result.status).toBe(200);
  return result.data!.revs[`issue:${issueId}`];
}

describe('useful links', () => {
  beforeEach(resetDb);

  it('starts empty and supports create, list, and delete', async () => {
    const { asOwner, issueId } = await setup();
    expect((await usefulLinks(asOwner, issueId).get()).data).toEqual([]);

    const created = await createUsefulLink(asOwner, issueId);
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({ url: 'https://example.com/docs' });
    expect(new Date(created.data!.createdAt).toISOString()).toMatch(/Z$/);

    const listed = await usefulLinks(asOwner, issueId).get();
    expect(listed.status).toBe(200);
    expect(listed.data).toEqual([created.data!]);

    expect(
      (await asOwner['useful-links']({ usefulLinkId: created.data!.id }).delete()).status,
    ).toBe(204);
    expect((await usefulLinks(asOwner, issueId).get()).data).toEqual([]);
  });

  it('lists links by creation time and id', async () => {
    const { asOwner, issueId } = await setup();
    const first = await createUsefulLink(asOwner, issueId, 'https://example.com/first');
    const second = await createUsefulLink(asOwner, issueId, 'https://example.com/second');
    const third = await createUsefulLink(asOwner, issueId, 'https://example.com/third');

    expect((await usefulLinks(asOwner, issueId).get()).data!.map((link) => link.id)).toEqual([
      first.data!.id,
      second.data!.id,
      third.data!.id,
    ]);
  });

  it('trims and canonically serializes URLs without dropping components', async () => {
    const { asOwner, issueId } = await setup();
    const result = await createUsefulLink(
      asOwner,
      issueId,
      '  HTTPS://Example.COM:443/a/../docs?q=one%20two#section  ',
    );

    expect(result.status).toBe(201);
    expect(result.data!.url).toBe('https://example.com/docs?q=one%20two#section');
  });

  it('stores private HTTP URLs without fetching them', async () => {
    const { asOwner, issueId } = await setup();
    const result = await createUsefulLink(asOwner, issueId, 'http://127.0.0.1:9/private');

    expect(result.status).toBe(201);
    expect(result.data!.url).toBe('http://127.0.0.1:9/private');
  });

  it('rejects malformed, relative, unsupported, and credential-bearing URLs', async () => {
    const { asOwner, issueId } = await setup();
    for (const url of [
      '',
      'not a URL',
      '/relative',
      'file:///etc/passwd',
      'mailto:user@example.com',
      'https://user@example.com/path',
      'https://user:secret@example.com/path',
    ]) {
      expect((await createUsefulLink(asOwner, issueId, url)).status).toBe(400);
    }
  });

  it('enforces the 4096-character limit after canonicalization', async () => {
    const { asOwner, issueId } = await setup();
    const prefix = 'https://example.com/';
    const atLimit = prefix + 'x'.repeat(4096 - prefix.length);

    expect((await createUsefulLink(asOwner, issueId, `  ${atLimit}  `)).status).toBe(201);
    expect((await createUsefulLink(asOwner, issueId, `${atLimit}x`)).status).toBe(400);
  });

  it('returns 409 for duplicate canonical URLs on one issue', async () => {
    const { asOwner, issueId } = await setup();
    expect((await createUsefulLink(asOwner, issueId, 'HTTPS://Example.COM:443')).status).toBe(201);
    expect((await createUsefulLink(asOwner, issueId, 'https://example.com/')).status).toBe(409);
  });

  it('keeps links isolated by issue', async () => {
    const { asOwner, issueId } = await setup();
    const project = (await asOwner.projects({ projectKey: 'MKT' }).get()).data!;
    const other = (
      await asOwner.projects({ projectKey: 'MKT' }).issues.post({
        columnId: project.columns[0].id,
        title: 'Other task',
      })
    ).data!;

    expect((await createUsefulLink(asOwner, issueId)).status).toBe(201);
    expect((await createUsefulLink(asOwner, other.id)).status).toBe(201);
    expect((await usefulLinks(asOwner, issueId).get()).data).toHaveLength(1);
    expect((await usefulLinks(asOwner, other.id).get()).data).toHaveLength(1);
  });

  it('returns 404 for unknown issues and useful links', async () => {
    const { asOwner } = await setup();

    expect((await usefulLinks(asOwner, 999999).get()).status).toBe(404);
    expect((await createUsefulLink(asOwner, 999999)).status).toBe(404);
    expect((await asOwner['useful-links']({ usefulLinkId: 999999 }).delete()).status).toBe(404);
  });

  it('lets readers list and editors mutate while denying outsiders', async () => {
    const { asOwner, issueId } = await setup();
    const ownerLink = (await createUsefulLink(asOwner, issueId)).data!;
    const readerRole = await createRole(asOwner, 'MKT', {
      name: 'Reader',
      permissions: { work_items: { read: true } },
    });
    const editorRole = await createRole(asOwner, 'MKT', {
      name: 'Editor',
      permissions: { work_items: { read: true, edit: true } },
    });
    const reader = await addProjectMember(asOwner, 'MKT', readerRole.data!.id);
    const editor = await addProjectMember(asOwner, 'MKT', editorRole.data!.id);
    const outsider = authedApi((await signUpTestUser()).cookie);

    expect((await usefulLinks(reader, issueId).get()).status).toBe(200);
    expect((await createUsefulLink(reader, issueId, 'https://example.com/reader')).status).toBe(
      403,
    );
    expect((await reader['useful-links']({ usefulLinkId: ownerLink.id }).delete()).status).toBe(
      403,
    );

    const editorLink = await createUsefulLink(editor, issueId, 'https://example.com/editor');
    expect(editorLink.status).toBe(201);
    expect(
      (await editor['useful-links']({ usefulLinkId: editorLink.data!.id }).delete()).status,
    ).toBe(204);

    expect((await usefulLinks(outsider, issueId).get()).status).toBe(403);
    expect((await createUsefulLink(outsider, issueId, 'https://example.com/outsider')).status).toBe(
      403,
    );
    expect((await outsider['useful-links']({ usefulLinkId: ownerLink.id }).delete()).status).toBe(
      403,
    );
  });

  it('resolves delete permission from the useful link owning project', async () => {
    const { asOwner } = await setup();
    const editorRole = await createRole(asOwner, 'MKT', {
      name: 'Editor',
      permissions: { work_items: { read: true, edit: true } },
    });
    const editor = await addProjectMember(asOwner, 'MKT', editorRole.data!.id);
    await asOwner.projects.post({ key: 'OPS', name: 'Operations' });
    const project = (await asOwner.projects({ projectKey: 'OPS' }).get()).data!;
    const issue = (
      await asOwner.projects({ projectKey: 'OPS' }).issues.post({
        columnId: project.columns[0].id,
        title: 'Foreign task',
      })
    ).data!;
    const foreignLink = (await createUsefulLink(asOwner, issue.id)).data!;

    expect((await editor['useful-links']({ usefulLinkId: foreignLink.id }).delete()).status).toBe(
      403,
    );
    expect((await usefulLinks(asOwner, issue.id).get()).data).toHaveLength(1);
  });

  it('cascades links when their issue is deleted', async () => {
    const { asOwner, issueId } = await setup();
    const link = (await createUsefulLink(asOwner, issueId)).data!;

    expect((await asOwner.issues({ issueId }).delete()).status).toBe(204);
    expect((await asOwner['useful-links']({ usefulLinkId: link.id }).delete()).status).toBe(404);
  });

  it('moves the issue-detail revision on create and delete', async () => {
    const { asOwner, issueId } = await setup();
    const beforeCreate = await revision(asOwner, issueId);

    const link = (await createUsefulLink(asOwner, issueId)).data!;
    const afterCreate = await revision(asOwner, issueId);
    expect(afterCreate).not.toBe(beforeCreate);

    await asOwner['useful-links']({ usefulLinkId: link.id }).delete();
    expect(await revision(asOwner, issueId)).not.toBe(afterCreate);
  });
});
