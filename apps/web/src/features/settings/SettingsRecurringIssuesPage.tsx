'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useShell } from '@/context/shellContext';
import SectionPageView from '@/components/common/page/SectionPageView';
import RequirePermission from '@/components/common/permissions/RequirePermission';
import { useSettingsSectionText } from '@/hooks/useSectionLabels';
import { settingsSection } from '@/utils/settingsSections';
import { SettingsHeaderAddButton } from './components/crud/SettingsHeaderAddButton';
import SettingsRecurringIssues from './components/recurring-issues/SettingsRecurringIssues';
import { SettingsResourceProvider } from './context/settingsPermission';

const section = settingsSection('recurring-issues');

export default function SettingsRecurringIssuesPage() {
  const t = useTranslations('settings.recurringIssues');
  const sectionText = useSettingsSectionText()(section.slug);
  const { project } = useShell();
  const [addNew, setAddNew] = useState(false);
  if (!project) return null;
  return (
    <SectionPageView
      title={sectionText.label}
      description={sectionText.description}
      wide
      actions={
        <SettingsHeaderAddButton
          resource={section.resource}
          label={t('newTitle')}
          onClick={() => setAddNew(true)}
        />
      }
    >
      <SettingsResourceProvider resource={section.resource}>
        <RequirePermission resource={section.resource} action="read">
          <SettingsRecurringIssues
            project={project}
            requestNew={addNew}
            onNewHandled={() => setAddNew(false)}
          />
        </RequirePermission>
      </SettingsResourceProvider>
    </SectionPageView>
  );
}
