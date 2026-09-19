import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { RecurringIssue } from '@/lib/api/endpoints/recurringIssues';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/page/EmptyState';
import ListPager from '@/components/common/ListPager';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { usePaging } from '@/hooks/usePaging';
import { qk } from '@/services/queryKeys';
import {
  useCreateRecurringIssue,
  useRecurringIssues,
  useSetRecurringIssueState,
  useUpdateRecurringIssue,
} from '@/services/recurringIssues.service';
import { revScope } from '@/utils/revScopes';
import { useSettingsCan } from '../../context/settingsPermission';
import type { RecurringIssueFormValues } from '../../utils/recurringIssueForm';
import SettingsConfirmDeleteDialog from '../crud/SettingsConfirmDeleteDialog';
import SettingsRecurringIssueDialog from './SettingsRecurringIssueDialog';
import SettingsRecurringIssueHistory from './SettingsRecurringIssueHistory';
import SettingsRecurringIssueRow from './SettingsRecurringIssueRow';

export default function SettingsRecurringIssues({
  project,
  requestNew,
  onNewHandled,
}: {
  project: ProjectDetail;
  requestNew: boolean;
  onNewHandled: () => void;
}) {
  const t = useTranslations('settings.recurringIssues');
  const can = useSettingsCan();
  const projectKey = project.project.key;
  const paging = usePaging();
  const query = useRecurringIssues(projectKey, paging.params);
  const create = useCreateRecurringIssue(projectKey);
  const update = useUpdateRecurringIssue(projectKey);
  const setState = useSetRecurringIssueState(projectKey);
  const [editing, setEditing] = useState<RecurringIssue | 'new' | null>(null);
  const [cancelling, setCancelling] = useState<RecurringIssue | null>(null);
  const [history, setHistory] = useState<RecurringIssue | null>(null);
  useLiveRefresh({
    scope: revScope.recurring(project.project.id),
    targets: [qk.recurringIssues(projectKey)],
  });

  useEffect(() => {
    if (!requestNew) return;
    setEditing('new');
    onNewHandled();
  }, [requestNew, onNewHandled]);

  if (query.isLoading) return <ListSkeleton rows={4} rowClassName="h-24" />;
  if (query.isError) {
    return (
      <EmptyState title={t('loadFailed')} description={t('loadFailedHint')}>
        <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
          {t('tryAgain')}
        </Button>
      </EmptyState>
    );
  }
  const rows = query.data?.items ?? [];

  async function save(values: RecurringIssueFormValues) {
    if (editing === 'new') await create.mutateAsync(values);
    else if (editing) await update.mutateAsync({ id: editing.id, patch: values });
    setEditing(null);
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {rows.map((row) => (
              <SettingsRecurringIssueRow
                key={row.id}
                recurringIssue={row}
                onEdit={() => setEditing(row)}
                onHistory={() => setHistory(row)}
                onToggle={() =>
                  setState.mutate({
                    id: row.id,
                    action: row.status === 'active' ? 'pause' : 'resume',
                  })
                }
                onCancel={() => setCancelling(row)}
              />
            ))}
          </div>
          <ListPager paging={paging} total={query.data?.total ?? 0} />
        </div>
      )}
      {editing && can(editing === 'new' ? 'create' : 'edit') && (
        <SettingsRecurringIssueDialog
          project={project}
          initial={editing === 'new' ? undefined : editing}
          saving={create.isPending || update.isPending}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
      {cancelling && (
        <SettingsConfirmDeleteDialog
          title={t('cancelTitle')}
          confirmLabel={t('cancel')}
          message={t('cancelMessage', { name: cancelling.name })}
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            await setState.mutateAsync({ id: cancelling.id, action: 'cancel' });
            setCancelling(null);
          }}
        />
      )}
      {history && (
        <SettingsRecurringIssueHistory
          projectKey={projectKey}
          recurringIssue={history}
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}
