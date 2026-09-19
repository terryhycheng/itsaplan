import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RecurringIssueFormValues } from '../../utils/recurringIssueForm';

const TIMEZONES =
  typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];

export default function SettingsRecurringTimingFields({
  values,
  onChange,
}: {
  values: RecurringIssueFormValues;
  onChange: (patch: Partial<RecurringIssueFormValues>) => void;
}) {
  const t = useTranslations('settings.recurringIssues');
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="recurring-start">{t('startDate')}</Label>
          <Input
            id="recurring-start"
            type="date"
            required
            value={values.startDate}
            onChange={(event) => onChange({ startDate: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-time">{t('time')}</Label>
          <Input
            id="recurring-time"
            type="time"
            required
            value={values.localTime}
            onChange={(event) => onChange({ localTime: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-timezone">{t('timezone')}</Label>
          <select
            id="recurring-timezone"
            required
            value={values.timezone}
            onChange={(event) => onChange({ timezone: event.target.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {!TIMEZONES.includes(values.timezone) && (
              <option value={values.timezone}>{values.timezone}</option>
            )}
            {TIMEZONES.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-end">{t('endDate')}</Label>
          <Input
            id="recurring-end"
            type="date"
            min={values.startDate}
            value={values.endDate ?? ''}
            onChange={(event) => onChange({ endDate: event.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-limit">{t('maxOccurrences')}</Label>
          <Input
            id="recurring-limit"
            type="number"
            min={1}
            value={values.maxOccurrences ?? ''}
            onChange={(event) =>
              onChange({ maxOccurrences: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('dstHint')}</p>
    </>
  );
}
