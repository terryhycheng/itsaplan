import {
  db,
  customField,
  customFieldOption,
  initiative,
  issueType,
  label,
  projectColumn,
  recurringIssue,
  recurringIssueFieldOption,
  recurringIssueFieldValue,
  recurringIssueLabel,
  recurringIssueOccurrence,
} from '@repo/db';
import {
  nextOccurrence,
  validateRecurrenceRule,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from '@repo/recurrence';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { getMembership } from '#modules/members/service';
import { isProjectAgent } from '#modules/agents/core/service';
import { HttpError, iso, numOrNull } from '#shared/lib';

export interface RecurringIssueInput {
  name: string;
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: number[] | null;
  dayOfMonth?: number | null;
  month?: number | null;
  startDate: string;
  localTime: string;
  timezone: string;
  endDate?: string | null;
  maxOccurrences?: number | null;
  title: string;
  description?: string;
  columnId: number;
  typeId?: number | null;
  initiativeId?: number | null;
  assigneeUserId?: string | null;
  delegateUserId?: string | null;
  priority?: string | null;
  estimatePoints?: number | null;
  estimateMinutes?: number | null;
  startOffsetDays?: number | null;
  dueOffsetDays?: number | null;
  labelIds?: number[];
  fieldValues?: RecurringFieldValueInput[];
}

export interface RecurringFieldValueInput {
  fieldId: number;
  value?: string | number | boolean | null;
  valueEnd?: string | null;
  optionIds?: number[];
}

export interface RecurringFieldValueRow {
  fieldId: number;
  value: string | number | boolean | null;
  valueEnd: string | null;
  optionIds: number[];
}

export interface RecurringIssueRow {
  id: number;
  projectId: number;
  name: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: number[] | null;
  dayOfMonth: number | null;
  month: number | null;
  startDate: string;
  localTime: string;
  timezone: string;
  endDate: string | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  title: string;
  description: string;
  columnId: number | null;
  typeId: number | null;
  initiativeId: number | null;
  assigneeUserId: string | null;
  delegateUserId: string | null;
  priority: string | null;
  estimatePoints: number | null;
  estimateMinutes: number | null;
  startOffsetDays: number | null;
  dueOffsetDays: number | null;
  labelIds: number[];
  fieldValues: RecurringFieldValueRow[];
  createdAt: string;
  updatedAt: string;
}

type RecurringSelect = typeof recurringIssue.$inferSelect;

function ruleOf(value: {
  frequency: string;
  interval: number;
  weekdays: number[] | null;
  dayOfMonth: number | null;
  month: number | null;
  startDate: string;
  localTime: string;
  timezone: string;
  endDate: string | null;
}): RecurrenceRule {
  return {
    frequency: value.frequency as RecurrenceFrequency,
    interval: value.interval,
    weekdays: value.weekdays,
    dayOfMonth: value.dayOfMonth,
    month: value.month,
    startDate: value.startDate,
    time: value.localTime,
    timezone: value.timezone,
    endDate: value.endDate,
  };
}

function validateRule(rule: RecurrenceRule): void {
  try {
    validateRecurrenceRule(rule);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : 'Invalid recurrence');
  }
}

function mapRow(
  row: RecurringSelect,
  labelIds: number[],
  fieldValues: RecurringFieldValueRow[],
  lastError: string | null,
): RecurringIssueRow {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    status: row.status as RecurringIssueRow['status'],
    frequency: row.frequency as RecurrenceFrequency,
    interval: row.interval,
    weekdays: row.weekdays,
    dayOfMonth: row.dayOfMonth,
    month: row.month,
    startDate: row.startDate,
    localTime: row.localTime,
    timezone: row.timezone,
    endDate: row.endDate,
    maxOccurrences: row.maxOccurrences,
    occurrenceCount: row.occurrenceCount,
    nextRunAt: row.nextRunAt ? iso(row.nextRunAt) : null,
    lastRunAt: row.lastRunAt ? iso(row.lastRunAt) : null,
    lastError,
    title: row.title,
    description: row.description,
    columnId: row.columnId,
    typeId: row.typeId,
    initiativeId: row.initiativeId,
    assigneeUserId: row.assigneeUserId,
    delegateUserId: row.delegateUserId,
    priority: row.priority,
    estimatePoints: numOrNull(row.estimatePoints),
    estimateMinutes: row.estimateMinutes,
    startOffsetDays: row.startOffsetDays,
    dueOffsetDays: row.dueOffsetDays,
    labelIds,
    fieldValues,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

async function metadata(ids: number[]): Promise<{
  labels: Map<number, number[]>;
  fieldValues: Map<number, RecurringFieldValueRow[]>;
  errors: Map<number, string>;
}> {
  const labels = new Map<number, number[]>();
  const fieldValues = new Map<number, RecurringFieldValueRow[]>();
  const errors = new Map<number, string>();
  if (ids.length === 0) return { labels, fieldValues, errors };
  const labelRows = await db
    .select()
    .from(recurringIssueLabel)
    .where(inArray(recurringIssueLabel.recurringIssueId, ids));
  for (const row of labelRows) {
    const values = labels.get(row.recurringIssueId) ?? [];
    values.push(row.labelId);
    labels.set(row.recurringIssueId, values);
  }
  const [valueRows, optionRows] = await Promise.all([
    db
      .select()
      .from(recurringIssueFieldValue)
      .where(inArray(recurringIssueFieldValue.recurringIssueId, ids)),
    db
      .select()
      .from(recurringIssueFieldOption)
      .where(inArray(recurringIssueFieldOption.recurringIssueId, ids)),
  ]);
  for (const row of valueRows) {
    const values = fieldValues.get(row.recurringIssueId) ?? [];
    let value: string | number | boolean | null = row.valueText;
    if (row.valueNumber != null) value = Number(row.valueNumber);
    else if (row.valueBool != null) value = row.valueBool;
    else if (row.valueDate != null) value = row.valueDate;
    else if (row.valueDatetime != null) value = iso(row.valueDatetime);
    else if (row.valueUserId != null) value = row.valueUserId;
    values.push({
      fieldId: row.fieldId,
      value,
      valueEnd: row.valueDatetimeEnd ? iso(row.valueDatetimeEnd) : null,
      optionIds: [],
    });
    fieldValues.set(row.recurringIssueId, values);
  }
  for (const row of optionRows) {
    const values = fieldValues.get(row.recurringIssueId) ?? [];
    let value = values.find((item) => item.fieldId === row.fieldId);
    if (!value) {
      value = { fieldId: row.fieldId, value: null, valueEnd: null, optionIds: [] };
      values.push(value);
    }
    value.optionIds!.push(row.optionId);
    fieldValues.set(row.recurringIssueId, values);
  }
  const failureRows = await db.execute(sql`
    SELECT DISTINCT ON (recurring_issue_id) recurring_issue_id AS "recurringIssueId", last_error AS "lastError"
    FROM recurring_issue_occurrence
    WHERE recurring_issue_id IN ${ids} AND last_error IS NOT NULL
    ORDER BY recurring_issue_id, id DESC
  `);
  for (const row of failureRows as unknown as { recurringIssueId: number; lastError: string }[]) {
    errors.set(row.recurringIssueId, row.lastError);
  }
  return { labels, fieldValues, errors };
}

export async function listRecurringIssueFieldValues(id: number): Promise<RecurringFieldValueRow[]> {
  return (await metadata([id])).fieldValues.get(id) ?? [];
}

export async function listRecurringIssues(
  projectId: number,
  window: { limit: number; offset: number },
): Promise<{ items: RecurringIssueRow[]; total: number }> {
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(recurringIssue)
      .where(eq(recurringIssue.projectId, projectId))
      .orderBy(desc(recurringIssue.id))
      .limit(window.limit)
      .offset(window.offset),
    db
      .select({ value: count() })
      .from(recurringIssue)
      .where(eq(recurringIssue.projectId, projectId)),
  ]);
  const { labels, fieldValues, errors } = await metadata(rows.map((row) => row.id));
  return {
    items: rows.map((row) =>
      mapRow(
        row,
        labels.get(row.id) ?? [],
        fieldValues.get(row.id) ?? [],
        errors.get(row.id) ?? null,
      ),
    ),
    total: total.value,
  };
}

export async function getRecurringIssue(
  projectId: number,
  id: number,
): Promise<RecurringIssueRow | null> {
  const [row] = await db
    .select()
    .from(recurringIssue)
    .where(and(eq(recurringIssue.projectId, projectId), eq(recurringIssue.id, id)));
  if (!row) return null;
  const { labels, fieldValues, errors } = await metadata([id]);
  return mapRow(row, labels.get(id) ?? [], fieldValues.get(id) ?? [], errors.get(id) ?? null);
}

async function assertReferences(
  projectId: number,
  input: Partial<RecurringIssueInput>,
): Promise<void> {
  if (input.columnId != null) {
    const [row] = await db
      .select({ id: projectColumn.id })
      .from(projectColumn)
      .where(and(eq(projectColumn.id, input.columnId), eq(projectColumn.projectId, projectId)));
    if (!row) throw new HttpError(400, 'Column must belong to this project');
  }
  if (input.typeId != null) {
    const [row] = await db
      .select({ id: issueType.id })
      .from(issueType)
      .where(and(eq(issueType.id, input.typeId), eq(issueType.projectId, projectId)));
    if (!row) throw new HttpError(400, 'Issue type must belong to this project');
  }
  if (input.initiativeId != null) {
    const [row] = await db
      .select({ id: initiative.id })
      .from(initiative)
      .where(and(eq(initiative.id, input.initiativeId), eq(initiative.projectId, projectId)));
    if (!row) throw new HttpError(400, 'Initiative must belong to this project');
  }
  if (input.assigneeUserId && !(await getMembership(projectId, input.assigneeUserId))) {
    throw new HttpError(400, 'Assignee must belong to this project');
  }
  if (input.delegateUserId && !(await isProjectAgent(projectId, input.delegateUserId))) {
    throw new HttpError(400, 'Delegate must be an agent in this project');
  }
  const labelIds = [...new Set(input.labelIds ?? [])];
  if (labelIds.length > 0) {
    const rows = await db
      .select({ id: label.id })
      .from(label)
      .where(and(eq(label.projectId, projectId), inArray(label.id, labelIds)));
    if (rows.length !== labelIds.length)
      throw new HttpError(400, 'Labels must belong to this project');
  }
  if (
    input.startOffsetDays != null &&
    input.dueOffsetDays != null &&
    input.dueOffsetDays < input.startOffsetDays
  ) {
    throw new HttpError(400, 'Due date offset must not be before start date offset');
  }
}

async function setLabels(id: number, labelIds: number[]): Promise<void> {
  const values = [...new Set(labelIds)];
  await db.delete(recurringIssueLabel).where(eq(recurringIssueLabel.recurringIssueId, id));
  if (values.length) {
    await db
      .insert(recurringIssueLabel)
      .values(values.map((labelId) => ({ recurringIssueId: id, labelId })));
  }
}

async function fieldDefinitions(projectId: number, values: RecurringFieldValueInput[]) {
  const fieldIds = [...new Set(values.map((value) => value.fieldId))];
  if (fieldIds.length !== values.length) throw new HttpError(400, 'Custom fields must be unique');
  if (fieldIds.length === 0) return new Map<number, typeof customField.$inferSelect>();
  const rows = await db
    .select()
    .from(customField)
    .where(and(eq(customField.projectId, projectId), inArray(customField.id, fieldIds)));
  if (rows.length !== fieldIds.length) {
    throw new HttpError(400, 'Custom fields must belong to this project');
  }
  return new Map(rows.map((row) => [row.id, row]));
}

async function validateFieldValues(
  projectId: number,
  values: RecurringFieldValueInput[],
  typeId: number | null | undefined,
): Promise<void> {
  const fields = await fieldDefinitions(projectId, values);
  for (const input of values) {
    const field = fields.get(input.fieldId)!;
    if (field.issueTypeId != null && field.issueTypeId !== typeId) {
      throw new HttpError(400, 'Custom field does not apply to the selected issue type');
    }
    if (field.fieldType === 'select' || field.fieldType === 'multi_select') {
      const optionIds = [...new Set(input.optionIds ?? [])];
      if (field.fieldType === 'select' && optionIds.length > 1) {
        throw new HttpError(400, 'Select fields accept one option');
      }
      if (optionIds.length) {
        const options = await db
          .select({ id: customFieldOption.id })
          .from(customFieldOption)
          .where(
            and(eq(customFieldOption.fieldId, field.id), inArray(customFieldOption.id, optionIds)),
          );
        if (options.length !== optionIds.length) {
          throw new HttpError(400, 'Custom field option does not belong to its field');
        }
      }
      continue;
    }
    if (field.fieldType === 'number' && input.value != null && !Number.isFinite(input.value)) {
      throw new HttpError(400, 'Custom number field must be finite');
    }
    if (field.fieldType === 'boolean' && input.value != null && typeof input.value !== 'boolean') {
      throw new HttpError(400, 'Custom boolean field must be a boolean');
    }
    if (field.fieldType === 'url' && input.value) {
      try {
        const url = new URL(String(input.value));
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
      } catch {
        throw new HttpError(400, 'Custom URL field must be an HTTP URL');
      }
    }
    if (field.fieldType === 'member' && input.value) {
      if (typeof input.value !== 'string') {
        throw new HttpError(400, 'Custom member field must contain a user ID');
      }
      const userId = String(input.value);
      const [membership, agent] = await Promise.all([
        getMembership(projectId, userId),
        isProjectAgent(projectId, userId),
      ]);
      if (
        !membership ||
        (field.memberScope === 'agents' && !agent) ||
        (field.memberScope === 'humans' && agent)
      ) {
        throw new HttpError(400, 'Custom member field value is outside its member scope');
      }
    }
    if (field.fieldType === 'date' && input.value != null) {
      const value = String(input.value);
      const parsed = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || parsed.toISOString().slice(0, 10) !== value) {
        throw new HttpError(400, 'Custom date field must use a valid ISO date');
      }
    }
    if (field.fieldType === 'datetime' || field.fieldType === 'datetime_range') {
      const start = input.value ? new Date(String(input.value)) : null;
      const end = input.valueEnd ? new Date(input.valueEnd) : null;
      if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
        throw new HttpError(400, 'Custom datetime field must use valid timestamps');
      }
      if (end && !start) throw new HttpError(400, 'Datetime range end needs a start');
      if (start && end && end <= start) {
        throw new HttpError(400, 'Datetime range end must be after its start');
      }
    }
    if (
      ['text', 'markdown', 'url'].includes(field.fieldType) &&
      input.value != null &&
      typeof input.value !== 'string'
    ) {
      throw new HttpError(400, 'Custom text field must be a string');
    }
  }
}

async function setFieldValues(id: number, values: RecurringFieldValueInput[]): Promise<void> {
  const fields = await fieldDefinitions(
    (
      await db
        .select({ projectId: recurringIssue.projectId })
        .from(recurringIssue)
        .where(eq(recurringIssue.id, id))
    )[0]!.projectId,
    values,
  );
  await db.transaction(async (tx) => {
    await tx
      .delete(recurringIssueFieldOption)
      .where(eq(recurringIssueFieldOption.recurringIssueId, id));
    await tx
      .delete(recurringIssueFieldValue)
      .where(eq(recurringIssueFieldValue.recurringIssueId, id));
    for (const input of values) {
      const field = fields.get(input.fieldId)!;
      if (field.fieldType === 'select' || field.fieldType === 'multi_select') {
        const optionIds = [...new Set(input.optionIds ?? [])];
        if (optionIds.length) {
          await tx.insert(recurringIssueFieldOption).values(
            optionIds.map((optionId) => ({
              recurringIssueId: id,
              fieldId: field.id,
              optionId,
            })),
          );
        }
        continue;
      }
      const stored: Partial<typeof recurringIssueFieldValue.$inferInsert> = {};
      if (field.fieldType === 'number') {
        stored.valueNumber = input.value == null ? null : String(input.value);
      } else if (field.fieldType === 'boolean') {
        stored.valueBool = input.value == null ? null : Boolean(input.value);
      } else if (field.fieldType === 'date') {
        stored.valueDate = input.value == null ? null : String(input.value);
      } else if (field.fieldType === 'member') {
        stored.valueUserId = input.value == null ? null : String(input.value);
      } else if (field.fieldType === 'datetime' || field.fieldType === 'datetime_range') {
        stored.valueDatetime = input.value == null ? null : new Date(String(input.value));
        stored.valueDatetimeEnd = input.valueEnd == null ? null : new Date(input.valueEnd);
      } else {
        stored.valueText = input.value == null ? null : String(input.value);
      }
      await tx.insert(recurringIssueFieldValue).values({
        recurringIssueId: id,
        fieldId: field.id,
        ...stored,
      });
    }
  });
}

function scheduleValues(input: RecurringIssueInput): {
  weekdays: number[] | null;
  dayOfMonth: number | null;
  month: number | null;
  endDate: string | null;
  nextRunAt: Date | null;
} {
  const rule = ruleOf({
    ...input,
    weekdays: input.weekdays ?? null,
    dayOfMonth: input.dayOfMonth ?? null,
    month: input.month ?? null,
    endDate: input.endDate ?? null,
  });
  validateRule(rule);
  return {
    weekdays: rule.weekdays ?? null,
    dayOfMonth: rule.dayOfMonth ?? null,
    month: rule.month ?? null,
    endDate: rule.endDate ?? null,
    nextRunAt: nextOccurrence(rule, new Date(), { inclusive: true }),
  };
}

export async function createRecurringIssue(
  projectId: number,
  actorUserId: string,
  input: RecurringIssueInput,
): Promise<RecurringIssueRow> {
  await assertReferences(projectId, input);
  await validateFieldValues(projectId, input.fieldValues ?? [], input.typeId);
  const schedule = scheduleValues(input);
  const [row] = await db
    .insert(recurringIssue)
    .values({
      projectId,
      createdByUserId: actorUserId,
      name: input.name.trim(),
      status: schedule.nextRunAt ? 'active' : 'completed',
      frequency: input.frequency,
      interval: input.interval,
      ...schedule,
      startDate: input.startDate,
      localTime: input.localTime,
      timezone: input.timezone,
      maxOccurrences: input.maxOccurrences ?? null,
      title: input.title.trim(),
      description: input.description ?? '',
      columnId: input.columnId,
      typeId: input.typeId ?? null,
      initiativeId: input.initiativeId ?? null,
      assigneeUserId: input.assigneeUserId ?? null,
      delegateUserId: input.delegateUserId ?? null,
      priority: input.priority ?? null,
      estimatePoints: input.estimatePoints == null ? null : String(input.estimatePoints),
      estimateMinutes: input.estimateMinutes ?? null,
      startOffsetDays: input.startOffsetDays ?? null,
      dueOffsetDays: input.dueOffsetDays ?? null,
    })
    .returning({ id: recurringIssue.id });
  if (input.labelIds?.length) await setLabels(row.id, input.labelIds);
  if (input.fieldValues?.length) await setFieldValues(row.id, input.fieldValues);
  return (await getRecurringIssue(projectId, row.id))!;
}

export async function updateRecurringIssue(
  projectId: number,
  id: number,
  patch: Partial<RecurringIssueInput>,
): Promise<RecurringIssueRow | null> {
  const current = await getRecurringIssue(projectId, id);
  if (!current) return null;
  if (current.status === 'cancelled' || current.status === 'completed') {
    throw new HttpError(409, 'Finished recurring issues cannot be edited');
  }
  await assertReferences(projectId, patch);
  const definedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<RecurringIssueInput>;
  const merged: RecurringIssueInput = {
    ...current,
    ...definedPatch,
    columnId: patch.columnId ?? current.columnId!,
  };
  await validateFieldValues(projectId, merged.fieldValues ?? [], merged.typeId);
  const schedule = scheduleValues(merged);
  const scheduleChanged = [
    'frequency',
    'interval',
    'weekdays',
    'dayOfMonth',
    'month',
    'startDate',
    'localTime',
    'timezone',
    'endDate',
  ].some((field) => field in patch);
  let nextRunAt: Date | null = null;
  if (current.status === 'active') {
    if (scheduleChanged) nextRunAt = schedule.nextRunAt;
    else if (current.nextRunAt) nextRunAt = new Date(current.nextRunAt);
  }
  await db
    .update(recurringIssue)
    .set({
      name: merged.name.trim(),
      frequency: merged.frequency,
      interval: merged.interval,
      weekdays: schedule.weekdays,
      dayOfMonth: schedule.dayOfMonth,
      month: schedule.month,
      startDate: merged.startDate,
      localTime: merged.localTime,
      timezone: merged.timezone,
      endDate: schedule.endDate,
      maxOccurrences: merged.maxOccurrences ?? null,
      nextRunAt,
      title: merged.title.trim(),
      description: merged.description,
      columnId: merged.columnId,
      typeId: merged.typeId ?? null,
      initiativeId: merged.initiativeId ?? null,
      assigneeUserId: merged.assigneeUserId ?? null,
      delegateUserId: merged.delegateUserId ?? null,
      priority: merged.priority ?? null,
      estimatePoints: merged.estimatePoints == null ? null : String(merged.estimatePoints),
      estimateMinutes: merged.estimateMinutes ?? null,
      startOffsetDays: merged.startOffsetDays ?? null,
      dueOffsetDays: merged.dueOffsetDays ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(recurringIssue.projectId, projectId), eq(recurringIssue.id, id)));
  if (patch.labelIds) await setLabels(id, patch.labelIds);
  if (patch.fieldValues) await setFieldValues(id, patch.fieldValues);
  return getRecurringIssue(projectId, id);
}

export async function setRecurringIssueStatus(
  projectId: number,
  id: number,
  status: 'active' | 'paused' | 'cancelled',
): Promise<RecurringIssueRow | null> {
  const current = await getRecurringIssue(projectId, id);
  if (!current) return null;
  if (current.status === 'cancelled' || current.status === 'completed') {
    throw new HttpError(409, 'Finished recurring issues cannot change status');
  }
  let allowedStatuses: ('active' | 'paused')[];
  if (status === 'active') allowedStatuses = ['paused'];
  else if (status === 'paused') allowedStatuses = ['active'];
  else allowedStatuses = ['active', 'paused'];
  if (!allowedStatuses.includes(current.status)) {
    throw new HttpError(409, 'Recurring issue is already in the requested state');
  }
  if (status === 'active' && current.columnId == null) {
    throw new HttpError(409, 'Select a valid column before resuming');
  }
  let nextRunAt: Date | null = null;
  if (status === 'active') {
    nextRunAt = nextOccurrence(ruleOf(current), new Date());
    if (!nextRunAt) throw new HttpError(409, 'This recurrence has no future occurrences');
  }
  const [updated] = await db
    .update(recurringIssue)
    .set({ status, nextRunAt, updatedAt: new Date() })
    .where(
      and(
        eq(recurringIssue.projectId, projectId),
        eq(recurringIssue.id, id),
        inArray(recurringIssue.status, allowedStatuses),
      ),
    )
    .returning({ id: recurringIssue.id });
  if (!updated) throw new HttpError(409, 'Finished recurring issues cannot change status');
  return getRecurringIssue(projectId, id);
}

export async function listRecurringIssueOccurrences(
  projectId: number,
  id: number,
  window: { limit: number; offset: number },
): Promise<{ items: RecurringOccurrenceRow[]; total: number } | null> {
  if (!(await getRecurringIssue(projectId, id))) return null;
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(recurringIssueOccurrence)
      .where(eq(recurringIssueOccurrence.recurringIssueId, id))
      .orderBy(desc(recurringIssueOccurrence.id))
      .limit(window.limit)
      .offset(window.offset),
    db
      .select({ value: count() })
      .from(recurringIssueOccurrence)
      .where(eq(recurringIssueOccurrence.recurringIssueId, id)),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      scheduledFor: iso(row.scheduledFor),
      status: row.status as RecurringOccurrenceRow['status'],
      issueId: row.issueId,
      attempts: row.attempts,
      lastError: row.lastError,
      createdAt: iso(row.createdAt),
      finishedAt: row.finishedAt ? iso(row.finishedAt) : null,
    })),
    total: total.value,
  };
}

export interface RecurringOccurrenceRow {
  id: number;
  scheduledFor: string;
  status: 'pending' | 'created' | 'skipped' | 'failed';
  issueId: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  finishedAt: string | null;
}
