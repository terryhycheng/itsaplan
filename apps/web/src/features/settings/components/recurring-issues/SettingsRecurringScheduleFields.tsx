import type { RecurringIssueFormValues } from '../../utils/recurringIssueForm';
import SettingsRecurringPatternFields from './SettingsRecurringPatternFields';
import SettingsRecurringScheduleDescription from './SettingsRecurringScheduleDescription';
import SettingsRecurringTimingFields from './SettingsRecurringTimingFields';

export default function SettingsRecurringScheduleFields({
  values,
  onChange,
}: {
  values: RecurringIssueFormValues;
  onChange: (patch: Partial<RecurringIssueFormValues>) => void;
}) {
  return (
    <div className="space-y-4">
      <SettingsRecurringPatternFields values={values} onChange={onChange} />
      <p className="text-sm text-muted-foreground">
        <SettingsRecurringScheduleDescription value={values} />
      </p>
      <SettingsRecurringTimingFields values={values} onChange={onChange} />
    </div>
  );
}
