import { db, issue, issueUsefulLink } from '@repo/db';
import { asc, eq } from 'drizzle-orm';
import { iso, rethrowDuplicate } from '#shared/lib';

export interface UsefulLinkRow {
  id: number;
  url: string;
  createdAt: string;
}

function mapUsefulLink(row: typeof issueUsefulLink.$inferSelect): UsefulLinkRow {
  return {
    id: row.id,
    url: row.url,
    createdAt: iso(row.createdAt),
  };
}

export async function listUsefulLinks(issueId: number): Promise<UsefulLinkRow[]> {
  const rows = await db
    .select()
    .from(issueUsefulLink)
    .where(eq(issueUsefulLink.issueId, issueId))
    .orderBy(asc(issueUsefulLink.createdAt), asc(issueUsefulLink.id));
  return rows.map(mapUsefulLink);
}

export async function createUsefulLink(input: {
  issueId: number;
  url: string;
}): Promise<UsefulLinkRow> {
  const [row] = await db
    .insert(issueUsefulLink)
    .values(input)
    .returning()
    .catch((error) => rethrowDuplicate(error, 'useful link URL'));
  return mapUsefulLink(row);
}

export async function getUsefulLinkProjectId(id: number): Promise<number | null> {
  const [row] = await db
    .select({ projectId: issue.projectId })
    .from(issueUsefulLink)
    .innerJoin(issue, eq(issue.id, issueUsefulLink.issueId))
    .where(eq(issueUsefulLink.id, id));
  return row?.projectId ?? null;
}

export async function deleteUsefulLink(id: number): Promise<void> {
  await db.delete(issueUsefulLink).where(eq(issueUsefulLink.id, id));
}
