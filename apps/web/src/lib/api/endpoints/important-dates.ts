import { request } from '@/lib/api/core/client';

export interface ImportantDate {
  id: number;
  projectId: number;
  name: string;
  date: string;
  showOnTimeline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportantDateInput {
  name: string;
  date: string;
  showOnTimeline?: boolean;
}

export const listImportantDates = (projectKey: string) =>
  request<ImportantDate[]>(`/projects/${projectKey}/important-dates`);

export const createImportantDate = (projectKey: string, input: ImportantDateInput) =>
  request<ImportantDate>(`/projects/${projectKey}/important-dates`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateImportantDate = (importantDateId: number, patch: Partial<ImportantDateInput>) =>
  request<ImportantDate>(`/important-dates/${importantDateId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteImportantDate = (importantDateId: number) =>
  request<void>(`/important-dates/${importantDateId}`, { method: 'DELETE' });
