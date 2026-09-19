import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useUsefulLinksQuery } from '../../services/useful-links.service';
import IssueUsefulLinkCard from './IssueUsefulLinkCard';
import IssueUsefulLinkDialog from './IssueUsefulLinkDialog';

export default function IssueUsefulLinksGroup({
  issueId,
  readOnly,
}: {
  issueId: number;
  readOnly?: boolean;
}) {
  const t = useTranslations('issue.usefulLinks');
  const [adding, setAdding] = useState(false);
  const linksQuery = useUsefulLinksQuery(issueId);
  const links = linksQuery.data ?? [];

  return (
    <div>
      <div className="mb-3 flex h-7 items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t('title')}</h3>
        {!readOnly && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            {t('add')}
          </Button>
        )}
      </div>

      {linksQuery.isPending ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : links.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          {readOnly ? t('empty') : t('emptyHint')}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <IssueUsefulLinkCard key={link.id} issueId={issueId} link={link} readOnly={readOnly} />
          ))}
        </div>
      )}

      {adding && <IssueUsefulLinkDialog issueId={issueId} onClose={() => setAdding(false)} />}
    </div>
  );
}
