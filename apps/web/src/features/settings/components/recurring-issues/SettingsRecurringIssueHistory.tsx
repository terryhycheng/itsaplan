import { useTranslations } from 'next-intl';
import type { RecurringIssue } from '@/lib/api/endpoints/recurringIssues';
import Modal from '@/components/common/overlay/Modal';
import ListPager from '@/components/common/ListPager';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import { usePaging } from '@/hooks/usePaging';
import { useRecurringIssueOccurrences } from '@/services/recurringIssues.service';

export default function SettingsRecurringIssueHistory({
  projectKey,
  recurringIssue,
  onClose,
}: {
  projectKey: string;
  recurringIssue: RecurringIssue;
  onClose: () => void;
}) {
  const t = useTranslations('settings.recurringIssues');
  const paging = usePaging();
  const query = useRecurringIssueOccurrences(projectKey, recurringIssue.id, paging.params);
  return (
    <Modal title={t('historyTitle')} crumb={recurringIssue.name} onClose={onClose} wide>
      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-4 overflow-y-auto">
          {(query.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noOccurrences')}</p>
          ) : (
            <div className="divide-y rounded-md border">
              {query.data?.items.map((occurrence) => (
                <div
                  key={occurrence.id}
                  className="flex items-start justify-between gap-4 p-3 text-sm"
                >
                  <div>
                    <p>
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(occurrence.scheduledFor))}
                    </p>
                    {occurrence.lastError && (
                      <p className="mt-1 text-xs text-destructive">{occurrence.lastError}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t(`occurrenceStatuses.${occurrence.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <ListPager paging={paging} total={query.data?.total ?? 0} />
        </div>
      )}
    </Modal>
  );
}
