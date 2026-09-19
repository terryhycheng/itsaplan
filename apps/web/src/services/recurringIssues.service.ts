import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRecurringIssue,
  listRecurringIssueOccurrences,
  listRecurringIssues,
  setRecurringIssueState,
  updateRecurringIssue,
} from '@/lib/api/endpoints/recurringIssues';
import type { PageParams } from '@/lib/api/core/paging';
import { qk } from '@/services/queryKeys';

export function useRecurringIssues(projectKey: string, params: PageParams) {
  return useQuery({
    queryKey: qk.recurringIssuePage(projectKey, params),
    queryFn: () => listRecurringIssues(projectKey, params),
    placeholderData: keepPreviousData,
  });
}

export function useRecurringIssueOccurrences(
  projectKey: string,
  id: number | null,
  params: PageParams,
) {
  return useQuery({
    queryKey: qk.recurringIssueOccurrences(projectKey, id ?? 0, params),
    queryFn: () => listRecurringIssueOccurrences(projectKey, id!, params),
    enabled: id != null,
    placeholderData: keepPreviousData,
  });
}

function useInvalidateRecurringIssues(projectKey: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: qk.recurringIssues(projectKey) });
}

export function useCreateRecurringIssue(projectKey: string) {
  const invalidate = useInvalidateRecurringIssues(projectKey);
  return useMutation({
    mutationFn: (input: Parameters<typeof createRecurringIssue>[1]) =>
      createRecurringIssue(projectKey, input),
    onSuccess: invalidate,
  });
}

export function useUpdateRecurringIssue(projectKey: string) {
  const invalidate = useInvalidateRecurringIssues(projectKey);
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: Parameters<typeof updateRecurringIssue>[2];
    }) => updateRecurringIssue(projectKey, id, patch),
    onSuccess: invalidate,
  });
}

export function useSetRecurringIssueState(projectKey: string) {
  const invalidate = useInvalidateRecurringIssues(projectKey);
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'pause' | 'resume' | 'cancel' }) =>
      setRecurringIssueState(projectKey, id, action),
    onSuccess: invalidate,
  });
}
