import { t } from 'elysia';
import { isoDate } from '#shared/schemas';

export const MAX_IMPORTANT_DATE_NAME_LENGTH = 200;

const ImportantDate = isoDate("Date 'YYYY-MM-DD'.");

export const importantDateParams = t.Object({ importantDateId: t.Numeric() });

export const ImportantDateResponse = t.Object({
  id: t.Number(),
  projectId: t.Number(),
  name: t.String(),
  date: ImportantDate,
  showOnTimeline: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const ImportantDateListResponse = t.Array(ImportantDateResponse);

export const createImportantDateBody = t.Object({
  name: t.String({
    description: `Name after trimming, up to ${MAX_IMPORTANT_DATE_NAME_LENGTH} characters.`,
  }),
  date: ImportantDate,
  showOnTimeline: t.Optional(t.Boolean()),
});

export const updateImportantDateBody = t.Partial(createImportantDateBody);
