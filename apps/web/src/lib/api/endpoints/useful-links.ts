import { request } from '@/lib/api/core/client';

export interface UsefulLink {
  id: number;
  url: string;
  createdAt: string;
}

export const listUsefulLinks = (issueId: number) =>
  request<UsefulLink[]>(`/issues/${issueId}/useful-links`);

export const createUsefulLink = (issueId: number, url: string) =>
  request<UsefulLink>(`/issues/${issueId}/useful-links`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

export const deleteUsefulLink = (usefulLinkId: number) =>
  request<void>(`/useful-links/${usefulLinkId}`, { method: 'DELETE' });
