import { t } from 'elysia';
import { pageQueryFields, pageResponse } from '#shared/pagination';

export const recurringIssueParams = t.Object({
  projectKey: t.String(),
  recurringIssueId: t.Numeric(),
});

export const recurrenceFrequency = t.Union([
  t.Literal('daily'),
  t.Literal('weekly'),
  t.Literal('monthly'),
  t.Literal('yearly'),
]);
export const recurringIssueStatus = t.Union([
  t.Literal('active'),
  t.Literal('paused'),
  t.Literal('cancelled'),
  t.Literal('completed'),
]);

export const recurringIssueFieldValue = t.Object({
  fieldId: t.Integer(),
  value: t.Optional(t.Nullable(t.Union([t.String(), t.Number(), t.Boolean()]))),
  valueEnd: t.Optional(t.Nullable(t.String())),
  optionIds: t.Optional(t.Array(t.Integer())),
});

export const recurringIssueBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  frequency: recurrenceFrequency,
  interval: t.Integer({ minimum: 1, maximum: 100 }),
  weekdays: t.Optional(t.Nullable(t.Array(t.Integer({ minimum: 1, maximum: 7 })))),
  dayOfMonth: t.Optional(t.Nullable(t.Integer({ minimum: 1, maximum: 31 }))),
  month: t.Optional(t.Nullable(t.Integer({ minimum: 1, maximum: 12 }))),
  startDate: t.String(),
  localTime: t.String(),
  timezone: t.String({ minLength: 1, maxLength: 100 }),
  endDate: t.Optional(t.Nullable(t.String())),
  maxOccurrences: t.Optional(t.Nullable(t.Integer({ minimum: 1, maximum: 100_000 }))),
  title: t.String({ minLength: 1, maxLength: 500 }),
  description: t.Optional(t.String()),
  columnId: t.Integer(),
  typeId: t.Optional(t.Nullable(t.Integer())),
  initiativeId: t.Optional(t.Nullable(t.Integer())),
  assigneeUserId: t.Optional(t.Nullable(t.String())),
  delegateUserId: t.Optional(t.Nullable(t.String())),
  priority: t.Optional(t.Nullable(t.String())),
  estimatePoints: t.Optional(t.Nullable(t.Number({ minimum: 0 }))),
  estimateMinutes: t.Optional(t.Nullable(t.Integer({ minimum: 0 }))),
  startOffsetDays: t.Optional(t.Nullable(t.Integer({ minimum: -3650, maximum: 3650 }))),
  dueOffsetDays: t.Optional(t.Nullable(t.Integer({ minimum: -3650, maximum: 3650 }))),
  labelIds: t.Optional(t.Array(t.Integer())),
  fieldValues: t.Optional(t.Array(recurringIssueFieldValue)),
});

export const updateRecurringIssueBody = t.Partial(recurringIssueBody);

export const RecurringIssueResponse = t.Object({
  id: t.Number(),
  projectId: t.Number(),
  name: t.String(),
  status: recurringIssueStatus,
  frequency: recurrenceFrequency,
  interval: t.Number(),
  weekdays: t.Nullable(t.Array(t.Number())),
  dayOfMonth: t.Nullable(t.Number()),
  month: t.Nullable(t.Number()),
  startDate: t.String(),
  localTime: t.String(),
  timezone: t.String(),
  endDate: t.Nullable(t.String()),
  maxOccurrences: t.Nullable(t.Number()),
  occurrenceCount: t.Number(),
  nextRunAt: t.Nullable(t.String()),
  lastRunAt: t.Nullable(t.String()),
  lastError: t.Nullable(t.String()),
  title: t.String(),
  description: t.String(),
  columnId: t.Nullable(t.Number()),
  typeId: t.Nullable(t.Number()),
  initiativeId: t.Nullable(t.Number()),
  assigneeUserId: t.Nullable(t.String()),
  delegateUserId: t.Nullable(t.String()),
  priority: t.Nullable(t.String()),
  estimatePoints: t.Nullable(t.Number()),
  estimateMinutes: t.Nullable(t.Number()),
  startOffsetDays: t.Nullable(t.Number()),
  dueOffsetDays: t.Nullable(t.Number()),
  labelIds: t.Array(t.Number()),
  fieldValues: t.Array(
    t.Object({
      fieldId: t.Number(),
      value: t.Nullable(t.Union([t.String(), t.Number(), t.Boolean()])),
      valueEnd: t.Nullable(t.String()),
      optionIds: t.Array(t.Number()),
    }),
  ),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const RecurringIssuePageResponse = pageResponse(RecurringIssueResponse);
export const recurringIssuePageQuery = t.Object(pageQueryFields);

export const RecurringIssueOccurrenceResponse = t.Object({
  id: t.Number(),
  scheduledFor: t.String(),
  status: t.UnionEnum(['pending', 'created', 'skipped', 'failed']),
  issueId: t.Nullable(t.Number()),
  attempts: t.Number(),
  lastError: t.Nullable(t.String()),
  createdAt: t.String(),
  finishedAt: t.Nullable(t.String()),
});

export const RecurringIssueOccurrencePageResponse = pageResponse(RecurringIssueOccurrenceResponse);
