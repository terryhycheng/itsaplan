import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { RecurringIssue } from '@/lib/api/endpoints/recurringIssues';
import Modal from '@/components/common/overlay/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  recurringIssueFormValues,
  recurringIssueInput,
  type RecurringIssueFormValues,
} from '../../utils/recurringIssueForm';
import SettingsRecurringIssueProperties from './SettingsRecurringIssueProperties';
import SettingsRecurringScheduleFields from './SettingsRecurringScheduleFields';

export default function SettingsRecurringIssueDialog({
  project,
  initial,
  saving,
  onSubmit,
  onClose,
}: {
  project: ProjectDetail;
  initial?: RecurringIssue;
  saving: boolean;
  onSubmit: (values: RecurringIssueFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations('settings.recurringIssues');
  const tCommon = useTranslations('common');
  const [values, setValues] = useState(() => recurringIssueFormValues(project, initial));
  const change = (patch: Partial<RecurringIssueFormValues>) =>
    setValues((current) => ({ ...current, ...patch }));
  const invalid =
    !values.name.trim() ||
    !values.title.trim() ||
    values.columnId === 0 ||
    (values.frequency === 'weekly' && !values.weekdays?.length) ||
    (values.startOffsetDays != null &&
      values.dueOffsetDays != null &&
      values.dueOffsetDays < values.startOffsetDays);

  return (
    <Modal title={t(initial ? 'editTitle' : 'newTitle')} onClose={onClose} wide="xl">
      <form
        className="space-y-7 overflow-y-auto px-0.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) void onSubmit(recurringIssueInput(values));
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="recurring-name">{tCommon('name')}</Label>
            <Input
              id="recurring-name"
              autoFocus
              required
              maxLength={120}
              value={values.name}
              onChange={(event) => change({ name: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recurring-title">{t('issueTitle')}</Label>
            <Input
              id="recurring-title"
              dir="auto"
              required
              maxLength={500}
              value={values.title}
              onChange={(event) => change({ title: event.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-description">{t('issueDescription')}</Label>
          <Textarea
            id="recurring-description"
            dir="auto"
            rows={5}
            value={values.description}
            onChange={(event) => change({ description: event.target.value })}
          />
        </div>
        <div className="space-y-3 border-t border-border/50 pt-5">
          <h3 className="text-sm font-medium">{t('schedule')}</h3>
          <SettingsRecurringScheduleFields values={values} onChange={change} />
        </div>
        <div className="space-y-3 border-t border-border/50 pt-5">
          <h3 className="text-sm font-medium">{t('properties')}</h3>
          <SettingsRecurringIssueProperties project={project} values={values} onChange={change} />
        </div>
        {values.startOffsetDays != null &&
          values.dueOffsetDays != null &&
          values.dueOffsetDays < values.startOffsetDays && (
            <p className="text-sm text-destructive">{t('offsetError')}</p>
          )}
        <div className="flex justify-end gap-2 border-t border-border/50 pt-5">
          <Button type="button" variant="ghost" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={invalid || saving}>
            {tCommon(initial ? 'save' : 'add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
