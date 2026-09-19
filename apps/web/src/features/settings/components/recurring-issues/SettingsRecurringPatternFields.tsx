import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecurringIssueFormValues } from '../../utils/recurringIssueForm';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function SettingsRecurringPatternFields({
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
          <Label>{t('frequency')}</Label>
          <Select
            value={values.frequency}
            onValueChange={(frequency) =>
              onChange({ frequency: frequency as RecurringIssueFormValues['frequency'] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((frequency) => (
                <SelectItem key={frequency} value={frequency}>
                  {t(`frequencies.${frequency}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-interval">{t('interval')}</Label>
          <Input
            id="recurring-interval"
            type="number"
            min={1}
            max={100}
            value={values.interval}
            onChange={(event) => onChange({ interval: Number(event.target.value) })}
          />
        </div>
      </div>

      {values.frequency === 'weekly' && (
        <div className="space-y-1.5">
          <Label>{t('weekdays')}</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const selected = values.weekdays?.includes(day) ?? false;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  className={`size-9 rounded-md border text-sm ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}
                  onClick={() =>
                    onChange({
                      weekdays: selected
                        ? values.weekdays?.filter((value) => value !== day)
                        : [...(values.weekdays ?? []), day],
                    })
                  }
                >
                  {t(`days.${day}`)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(values.frequency === 'monthly' || values.frequency === 'yearly') && (
        <div className="grid gap-4 sm:grid-cols-2">
          {values.frequency === 'yearly' && (
            <div className="space-y-1.5">
              <Label htmlFor="recurring-month">{t('month')}</Label>
              <Input
                id="recurring-month"
                type="number"
                min={1}
                max={12}
                value={values.month ?? 1}
                onChange={(event) => onChange({ month: Number(event.target.value) })}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="recurring-day">{t('dayOfMonth')}</Label>
            <Input
              id="recurring-day"
              type="number"
              min={1}
              max={31}
              value={values.dayOfMonth ?? 1}
              onChange={(event) => onChange({ dayOfMonth: Number(event.target.value) })}
            />
          </div>
        </div>
      )}
    </>
  );
}
