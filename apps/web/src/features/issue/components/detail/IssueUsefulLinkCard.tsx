import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import EditorLinkPreviewCard from '@/components/common/editor/EditorLinkPreviewCard';
import { useLinkPreviewQuery } from '@/components/common/editor/useLinkPreviewQuery';
import { Button } from '@/components/ui/button';
import type { UsefulLink } from '@/lib/api/endpoints/useful-links';
import { useDeleteUsefulLink } from '../../services/useful-links.service';

export default function IssueUsefulLinkCard({
  issueId,
  link,
  readOnly,
}: {
  issueId: number;
  link: UsefulLink;
  readOnly?: boolean;
}) {
  const t = useTranslations('issue.usefulLinks');
  const tCommon = useTranslations('common');
  const [activated, setActivated] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const deleteLink = useDeleteUsefulLink(issueId);
  const previewQuery = useLinkPreviewQuery(link.url, activated);
  const preview = previewQuery.data
    ? {
        ...previewQuery.data,
        image: previewQuery.data.image?.startsWith('data:image/') ? previewQuery.data.image : null,
      }
    : undefined;

  useEffect(() => {
    if (activated || !container.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setActivated(true);
        observer.disconnect();
      }
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [activated]);

  return (
    <div
      ref={container}
      className="relative overflow-hidden rounded-xl border bg-card"
      onPointerEnter={() => setActivated(true)}
      onFocusCapture={() => setActivated(true)}
    >
      <EditorLinkPreviewCard
        url={link.url}
        preview={preview}
        loading={activated && previewQuery.isPending}
        loadingLabel={t('loadingPreview')}
        unavailableLabel={t('previewUnavailable')}
      />
      {!readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-2 top-2 size-7 bg-card/90 text-muted-foreground hover:text-destructive"
          title={tCommon('delete')}
          aria-label={t('deleteLink', { url: link.url })}
          disabled={deleteLink.isPending}
          onClick={() => deleteLink.mutate(link.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
