import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUsefulLink,
  deleteUsefulLink,
  listUsefulLinks,
} from '@/lib/api/endpoints/useful-links';
import { qk } from '@/services/queryKeys';

export function useUsefulLinksQuery(issueId: number) {
  return useQuery({ queryKey: qk.usefulLinks(issueId), queryFn: () => listUsefulLinks(issueId) });
}

export function useCreateUsefulLink(issueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => createUsefulLink(issueId, url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.usefulLinks(issueId) }),
  });
}

export function useDeleteUsefulLink(issueId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUsefulLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.usefulLinks(issueId) }),
  });
}
