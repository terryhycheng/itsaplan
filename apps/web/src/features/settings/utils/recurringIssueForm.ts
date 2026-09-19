import type { RecurringIssue, RecurringIssueInput } from '@/lib/api/endpoints/recurringIssues';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';

export type RecurringIssueFormValues = RecurringIssueInput;

export function recurringIssueFormValues(
  project: ProjectDetail,
  initial?: RecurringIssue,
): RecurringIssueFormValues {
  const current = new Date();
  const today = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
  return {
    name: initial?.name ?? '',
    frequency: initial?.frequency ?? 'weekly',
    interval: initial?.interval ?? 1,
    weekdays: initial?.weekdays ?? [1],
    dayOfMonth: initial?.dayOfMonth ?? 1,
    month: initial?.month ?? 1,
    startDate: initial?.startDate ?? today,
    localTime: initial?.localTime ?? '09:00',
    timezone: initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
    endDate: initial?.endDate ?? null,
    maxOccurrences: initial?.maxOccurrences ?? null,
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    columnId: initial?.columnId ?? project.columns[0]?.id ?? 0,
    typeId: initial?.typeId ?? null,
    initiativeId: initial?.initiativeId ?? null,
    assigneeUserId: initial?.assigneeUserId ?? null,
    delegateUserId: initial?.delegateUserId ?? null,
    priority: initial?.priority ?? null,
    estimatePoints: initial?.estimatePoints ?? null,
    estimateMinutes: initial?.estimateMinutes ?? null,
    startOffsetDays: initial?.startOffsetDays ?? null,
    dueOffsetDays: initial?.dueOffsetDays ?? null,
    labelIds: initial?.labelIds ?? [],
    fieldValues: initial?.fieldValues ?? [],
  };
}

export function recurringIssueInput(values: RecurringIssueFormValues): RecurringIssueInput {
  return {
    ...values,
    weekdays: values.frequency === 'weekly' ? values.weekdays : null,
    dayOfMonth:
      values.frequency === 'monthly' || values.frequency === 'yearly' ? values.dayOfMonth : null,
    month: values.frequency === 'yearly' ? values.month : null,
    endDate: values.endDate || null,
  };
}
