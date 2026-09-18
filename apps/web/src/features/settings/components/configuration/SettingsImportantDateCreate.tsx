import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import DatePill from '@/components/common/fields/DatePill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export default function SettingsImportantDateCreate({
  saving,
  onCreate,
}: {
  saving: boolean;
  onCreate: (input: { name: string; date: string; showOnTimeline: boolean }) => Promise<unknown>;
}) {
  const t = useTranslations('settings.configuration.importantDates');
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [showOnTimeline, setShowOnTimeline] = useState(true);

  async function submit() {
    if (!name.trim() || !date) return;
    await onCreate({ name: name.trim(), date, showOnTimeline });
    setName('');
    setDate(null);
    setShowOnTimeline(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('name')}
        className="h-8 min-w-40 flex-1"
      />
      <DatePill value={date} placeholder={t('date')} clearable={false} onChange={setDate} />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={showOnTimeline} onCheckedChange={setShowOnTimeline} />
        {t('showOnTimeline')}
      </label>
      <Button size="sm" disabled={saving || !name.trim() || !date} onClick={() => void submit()}>
        <Plus className="size-4" />
        {t('add')}
      </Button>
    </div>
  );
}
