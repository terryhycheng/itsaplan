import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ImportantDateInput,
  createImportantDate,
  deleteImportantDate,
  listImportantDates,
  updateImportantDate,
} from '@/lib/api/endpoints/important-dates';
import { qk } from '@/services/queryKeys';

export function useImportantDatesQuery(projectKey: string | null) {
  return useQuery({
    queryKey: qk.importantDates(projectKey ?? ''),
    queryFn: () => listImportantDates(projectKey!),
    enabled: projectKey != null,
  });
}

export function useCreateImportantDate(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportantDateInput) => createImportantDate(projectKey, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.importantDates(projectKey) }),
  });
}

export function useUpdateImportantDate(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<ImportantDateInput> }) =>
      updateImportantDate(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.importantDates(projectKey) }),
  });
}

export function useDeleteImportantDate(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteImportantDate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.importantDates(projectKey) }),
  });
}
