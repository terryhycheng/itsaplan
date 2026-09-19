import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/common/overlay/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateUsefulLink } from '../../services/useful-links.service';

const MAX_URL_LENGTH = 4096;

export default function IssueUsefulLinkDialog({
  issueId,
  onClose,
}: {
  issueId: number;
  onClose: () => void;
}) {
  const t = useTranslations('issue.usefulLinks');
  const tCommon = useTranslations('common');
  const [url, setUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const createLink = useCreateUsefulLink(issueId);
  const trimmedUrl = url.trim();
  let error: string | null = null;
  if (!trimmedUrl) error = t('urlRequired');
  else if (trimmedUrl.length > MAX_URL_LENGTH) error = t('urlTooLong', { max: MAX_URL_LENGTH });

  return (
    <Modal title={t('addTitle')} onClose={onClose}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (error) return;
          createLink.mutate(trimmedUrl, {
            onSuccess: () => {
              setUrl('');
              onClose();
            },
          });
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="useful-link-url" className="text-sm font-medium">
            {t('urlLabel')}
          </label>
          <Input
            id="useful-link-url"
            type="url"
            required
            maxLength={MAX_URL_LENGTH}
            autoFocus
            value={url}
            placeholder={t('urlPlaceholder')}
            aria-invalid={submitted && !!error}
            aria-describedby={submitted && error ? 'useful-link-url-error' : undefined}
            onChange={(event) => setUrl(event.target.value)}
          />
          {submitted && error && (
            <p id="useful-link-url-error" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={createLink.isPending} onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={createLink.isPending}>
            {createLink.isPending ? t('adding') : t('add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
