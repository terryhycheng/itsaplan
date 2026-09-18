import { useTranslations } from 'next-intl';
import { usePermissions } from '@/hooks/usePermissions';
import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsSection from '@/components/common/page/SettingsSection';
import {
  useCreateImportantDate,
  useDeleteImportantDate,
  useImportantDatesQuery,
  useUpdateImportantDate,
} from '@/services/importantDates.service';
import SettingsImportantDateCreate from './SettingsImportantDateCreate';
import SettingsImportantDateRow from './SettingsImportantDateRow';

export default function SettingsImportantDates({ projectKey }: { projectKey: string }) {
  const t = useTranslations('settings.configuration.importantDates');
  const { can } = usePermissions();
  const datesQuery = useImportantDatesQuery(projectKey);
  const createDate = useCreateImportantDate(projectKey);
  const updateDate = useUpdateImportantDate(projectKey);
  const deleteDate = useDeleteImportantDate(projectKey);
  const editable = can('workflow_config', 'edit');
  const saving = createDate.isPending || updateDate.isPending || deleteDate.isPending;

  return (
    <SettingsSection title={t('title')} description={t('description')}>
      <SettingsCard className="divide-y divide-border/60">
        {datesQuery.data?.map((importantDate) => (
          <SettingsImportantDateRow
            key={importantDate.id}
            importantDate={importantDate}
            editable={editable}
            saving={saving}
            onUpdate={(patch) => void updateDate.mutateAsync({ id: importantDate.id, patch })}
            onDelete={() => void deleteDate.mutateAsync(importantDate.id)}
          />
        ))}
        {datesQuery.isSuccess && datesQuery.data.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">{t('empty')}</p>
        )}
        {editable && (
          <SettingsImportantDateCreate
            saving={saving}
            onCreate={(input) => createDate.mutateAsync(input)}
          />
        )}
      </SettingsCard>
    </SettingsSection>
  );
}
