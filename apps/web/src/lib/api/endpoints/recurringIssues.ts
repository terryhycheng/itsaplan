import { request } from '@/lib/api/core/client';
import { pageQuery, type Page, type PageParams } from '@/lib/api/core/paging';
import type { IssueFieldValueInput } from './issues';

export interface RecurringIssueFieldValue extends IssueFieldValueInput {
  fieldId: number;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringIssueStatus = 'active' | 'paused' | 'cancelled' | 'completed';

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
  fieldValues?: RecurringIssueFieldValue[];
}

export interface RecurringIssue extends Omit<RecurringIssueInput, 'columnId' | 'description'> {
  id: number;
  projectId: number;
  status: RecurringIssueStatus;
  occurrenceCount: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  description: string;
  columnId: number | null;
  labelIds: number[];
  fieldValues: RecurringIssueFieldValue[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurringIssueOccurrence {
  id: number;
  scheduledFor: string;
  status: 'pending' | 'created' | 'skipped' | 'failed';
  issueId: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export const listRecurringIssues = (projectKey: string, params: PageParams) =>
  request<Page<RecurringIssue>>(`/projects/${projectKey}/recurring-issues${pageQuery(params)}`);

export const createRecurringIssue = (projectKey: string, input: RecurringIssueInput) =>
  request<RecurringIssue>(`/projects/${projectKey}/recurring-issues`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateRecurringIssue = (
  projectKey: string,
  id: number,
  patch: Partial<RecurringIssueInput>,
) =>
  request<RecurringIssue>(`/projects/${projectKey}/recurring-issues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const setRecurringIssueState = (
  projectKey: string,
  id: number,
  action: 'pause' | 'resume' | 'cancel',
) =>
  request<RecurringIssue>(`/projects/${projectKey}/recurring-issues/${id}/${action}`, {
    method: 'POST',
  });

export const listRecurringIssueOccurrences = (projectKey: string, id: number, params: PageParams) =>
  request<Page<RecurringIssueOccurrence>>(
    `/projects/${projectKey}/recurring-issues/${id}/occurrences${pageQuery(params)}`,
  );
