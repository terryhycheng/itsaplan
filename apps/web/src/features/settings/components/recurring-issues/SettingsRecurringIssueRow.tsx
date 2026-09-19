import { CalendarClock, History, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RecurringIssue } from '@/lib/api/endpoints/recurringIssues';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsCan } from '../../context/settingsPermission';
import SettingsRecurringScheduleDescription from './SettingsRecurringScheduleDescription';

function dateTime(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
}

function statusColor(status: RecurringIssue['status']): string {
  if (status === 'active') return 'bg-emerald-500';
  if (status === 'paused') return 'bg-amber-500';
  return 'bg-muted-foreground/40';
}

export default function SettingsRecurringIssueRow({
  recurringIssue,
  onEdit,
  onToggle,
  onCancel,
  onHistory,
}: {
  recurringIssue: RecurringIssue;
  onEdit: () => void;
  onToggle: () => void;
  onCancel: () => void;
  onHistory: () => void;
}) {
  const t = useTranslations('settings.recurringIssues');
  const can = useSettingsCan();
  const canToggle = recurringIssue.status === 'active' || recurringIssue.status === 'paused';
  return (
    <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', statusColor(recurringIssue.status))} />
          <p className="truncate font-medium" dir="auto">
            {recurringIssue.name}
          </p>
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {t(`statuses.${recurringIssue.status}`)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground" dir="auto">
          {recurringIssue.title}
        </p>
        {recurringIssue.lastError && (
          <p className="mt-1 text-xs text-destructive">{recurringIssue.lastError}</p>
        )}
      </div>
      <div className="text-sm">
        <p className="flex items-center gap-1.5">
          <CalendarClock className="size-4 text-muted-foreground" />
          <SettingsRecurringScheduleDescription value={recurringIssue} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {recurringIssue.localTime} {recurringIssue.timezone}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('nextRun')}: {dateTime(recurringIssue.nextRunAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 md:justify-end">
        <Button type="button" variant="ghost" size="icon" title={t('history')} onClick={onHistory}>
          <History />
        </Button>
        {can('edit') && canToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={t(recurringIssue.status === 'active' ? 'pause' : 'resume')}
            onClick={onToggle}
          >
            {recurringIssue.status === 'active' ? <Pause /> : <Play />}
          </Button>
        )}
        {can('edit') && canToggle && (
          <Button type="button" variant="ghost" size="icon" title={t('edit')} onClick={onEdit}>
            <Pencil />
          </Button>
        )}
        {can('delete') && canToggle && (
          <Button type="button" variant="ghost" size="icon" title={t('cancel')} onClick={onCancel}>
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
