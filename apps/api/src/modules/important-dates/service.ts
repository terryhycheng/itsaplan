import { db, projectImportantDate } from '@repo/db';
import { and, asc, eq } from 'drizzle-orm';
import { iso } from '#shared/lib';

export interface ImportantDateRow {
  id: number;
  projectId: number;
  name: string;
  date: string;
  showOnTimeline: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapImportantDate(row: typeof projectImportantDate.$inferSelect): ImportantDateRow {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    date: row.date,
    showOnTimeline: row.showOnTimeline,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function listImportantDates(projectId: number): Promise<ImportantDateRow[]> {
  const rows = await db
    .select()
    .from(projectImportantDate)
    .where(eq(projectImportantDate.projectId, projectId))
    .orderBy(asc(projectImportantDate.date), asc(projectImportantDate.id));
  return rows.map(mapImportantDate);
}

export async function listTimelineImportantDates(projectId: number): Promise<ImportantDateRow[]> {
  const rows = await db
    .select()
    .from(projectImportantDate)
    .where(
      and(
        eq(projectImportantDate.projectId, projectId),
        eq(projectImportantDate.showOnTimeline, true),
      ),
    )
    .orderBy(asc(projectImportantDate.date), asc(projectImportantDate.id));
  return rows.map(mapImportantDate);
}

export async function createImportantDate(input: {
  projectId: number;
  name: string;
  date: string;
  showOnTimeline?: boolean;
}): Promise<ImportantDateRow> {
  const [row] = await db
    .insert(projectImportantDate)
    .values({
      projectId: input.projectId,
      name: input.name,
      date: input.date,
      showOnTimeline: input.showOnTimeline ?? true,
    })
    .returning();
  return mapImportantDate(row);
}

export async function getImportantDateProjectId(id: number): Promise<number | null> {
  const [row] = await db
    .select({ projectId: projectImportantDate.projectId })
    .from(projectImportantDate)
    .where(eq(projectImportantDate.id, id));
  return row?.projectId ?? null;
}

export async function updateImportantDate(
  id: number,
  patch: { name?: string; date?: string; showOnTimeline?: boolean },
): Promise<ImportantDateRow | null> {
  const set: Partial<typeof projectImportantDate.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.date !== undefined) set.date = patch.date;
  if (patch.showOnTimeline !== undefined) set.showOnTimeline = patch.showOnTimeline;

  if (Object.keys(set).length === 0) {
    const [row] = await db
      .select()
      .from(projectImportantDate)
      .where(eq(projectImportantDate.id, id));
    return row ? mapImportantDate(row) : null;
  }

  set.updatedAt = new Date();
  const [row] = await db
    .update(projectImportantDate)
    .set(set)
    .where(eq(projectImportantDate.id, id))
    .returning();
  return row ? mapImportantDate(row) : null;
}

export async function deleteImportantDate(id: number): Promise<void> {
  await db.delete(projectImportantDate).where(eq(projectImportantDate.id, id));
}
