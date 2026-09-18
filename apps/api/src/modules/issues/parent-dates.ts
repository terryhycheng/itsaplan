import { db, issue } from '@repo/db';
import { eq, sql } from 'drizzle-orm';

export async function syncParentDates(parentId: number): Promise<void> {
  const [range] = await db
    .select({
      startDate: sql<string | null>`min(${issue.startDate})`,
      dueDate: sql<string | null>`max(${issue.dueDate})`,
    })
    .from(issue)
    .where(eq(issue.parentId, parentId));
  await db
    .update(issue)
    .set({
      startDate: range.startDate,
      dueDate: range.dueDate,
      updatedAt: sql`now()` as unknown as Date,
    })
    .where(eq(issue.id, parentId));
}
