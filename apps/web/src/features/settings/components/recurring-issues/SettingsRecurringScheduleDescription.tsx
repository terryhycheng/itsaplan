import { useTranslations } from 'next-intl';
import type { RecurringIssueFormValues } from '../../utils/recurringIssueForm';

type Schedule = Pick<
  RecurringIssueFormValues,
  'frequency' | 'interval' | 'weekdays' | 'dayOfMonth' | 'month'
>;

const WEEKDAY_KEYS = [
  'days.1',
  'days.2',
  'days.3',
  'days.4',
  'days.5',
  'days.6',
  'days.7',
] as const;

export default function SettingsRecurringScheduleDescription({ value }: { value: Schedule }) {
  const t = useTranslations('settings.recurringIssues');
  let description: string;
  if (value.frequency === 'weekly') {
    const days = (value.weekdays ?? []).map((day) => t(WEEKDAY_KEYS[day - 1]!)).join(', ');
    description = t('scheduleDescriptions.weekly', { interval: value.interval, days });
  } else if (value.frequency === 'monthly') {
    description = t('scheduleDescriptions.monthly', {
      interval: value.interval,
      day: value.dayOfMonth ?? 1,
    });
  } else if (value.frequency === 'yearly') {
    description = t('scheduleDescriptions.yearly', {
      interval: value.interval,
      month: value.month ?? 1,
      day: value.dayOfMonth ?? 1,
    });
  } else {
    description = t('scheduleDescriptions.daily', { interval: value.interval });
  }
  return <span>{description}</span>;
}
