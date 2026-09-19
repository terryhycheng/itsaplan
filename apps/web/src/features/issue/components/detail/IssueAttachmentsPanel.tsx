import type { Attachment } from '@/lib/api/endpoints/attachments';
import { useTranslations } from 'next-intl';
import { usePersistedOpen } from '../../hooks/usePersistedOpen';
import IssueAttachmentsGroup from './IssueAttachmentsGroup';
import IssueSectionHeading from './IssueSectionHeading';
import IssueUsefulLinksGroup from './IssueUsefulLinksGroup';

export default function IssueAttachmentsPanel({
  issueId,
  onInsert,
  onReplaced,
  readOnly,
}: {
  issueId: number;
  onInsert: (attachment: Attachment) => void;
  onReplaced: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations('issue.attachments');
  const { open, toggle } = usePersistedOpen('issue-attachments-open');

  return (
    <section className={`mt-6 border-t pt-5 ${open ? '' : '-mb-2'}`}>
      <div className={`flex h-7 items-center ${open ? 'mb-4' : ''}`}>
        <IssueSectionHeading label={t('sectionTitle')} open={open} onToggle={toggle} />
      </div>
      {open && (
        <div className="space-y-6">
          <IssueAttachmentsGroup
            issueId={issueId}
            onInsert={onInsert}
            onReplaced={onReplaced}
            readOnly={readOnly}
          />
          <IssueUsefulLinksGroup issueId={issueId} readOnly={readOnly} />
        </div>
      )}
    </section>
  );
}
