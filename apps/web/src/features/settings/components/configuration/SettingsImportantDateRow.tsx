import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ImportantDate } from '@/lib/api/endpoints/important-dates';
import { formatDate } from '@/utils/dates';
import DatePill from '@/components/common/fields/DatePill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export default function SettingsImportantDateRow({
  importantDate,
  editable,
  saving,
  onUpdate,
  onDelete,
}: {
  importantDate: ImportantDate;
  editable: boolean;
  saving: boolean;
  onUpdate: (patch: Partial<Pick<ImportantDate, 'name' | 'date' | 'showOnTimeline'>>) => void;
  onDelete: () => void;
}) {
  const t = useTranslations('settings.configuration.importantDates');
  const [name, setName] = useState(importantDate.name);

  useEffect(() => setName(importantDate.name), [importantDate.name]);

  const saveName = () => {
    const next = name.trim();
    if (next && next !== importantDate.name) onUpdate({ name: next });
    else setName(importantDate.name);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      {editable ? (
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={saveName}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          disabled={saving}
          aria-label={t('name')}
          className="h-8 min-w-40 flex-1"
        />
      ) : (
        <span className="min-w-40 flex-1 text-sm font-medium" dir="auto">
          {importantDate.name}
        </span>
      )}
      {editable ? (
        <DatePill
          value={importantDate.date}
          placeholder={t('date')}
          clearable={false}
          onChange={(date) => date && onUpdate({ date })}
        />
      ) : (
        <span className="text-sm text-muted-foreground">{formatDate(importantDate.date)}</span>
      )}
      {editable ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={importantDate.showOnTimeline}
            disabled={saving}
            onCheckedChange={(showOnTimeline) => onUpdate({ showOnTimeline })}
          />
          {t('showOnTimeline')}
        </label>
      ) : (
        <span className="text-sm text-muted-foreground">
          {importantDate.showOnTimeline ? t('shown') : t('hidden')}
        </span>
      )}
      {editable && (
        <Button
          variant="ghost"
          size="icon"
          disabled={saving}
          aria-label={t('deleteDate', { name: importantDate.name })}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
