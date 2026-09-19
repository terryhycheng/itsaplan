import { useRef, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Attachment } from '@/lib/api/endpoints/attachments';
import AttachmentViewer from '@/components/common/attachments/AttachmentViewer';
import { Button } from '@/components/ui/button';
import { useFileDragZone } from '@/hooks/useFileDragZone';
import { useStorageSettingsQuery } from '@/services/storage.service';
import { attachmentAccept, attachmentError, attachmentLimitHint } from '@/utils/uploadLimits';
import {
  useAttachmentsQuery,
  useDeleteAttachment,
  useReplaceAttachment,
  useUploadAttachment,
} from '../../services/attachments.service';
import { baseName } from '../../utils/filename';
import IssueImageAnnotator from '../IssueImageAnnotator';
import IssueAttachmentCard from './IssueAttachmentCard';

export default function IssueAttachmentsGroup({
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
  const attachmentsQuery = useAttachmentsQuery(issueId);
  const items = attachmentsQuery.data ?? [];
  const uploadAttachment = useUploadAttachment();
  const replaceAttachment = useReplaceAttachment(issueId);
  const deleteAttachment = useDeleteAttachment(issueId);
  const limits = useStorageSettingsQuery().data;
  const [error, setError] = useState<string | null>(null);
  const [annotating, setAnnotating] = useState<Attachment | null>(null);
  const [viewing, setViewing] = useState<Attachment | null>(null);
  const [replacedAt, setReplacedAt] = useState<Record<string, number>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const uploading = uploadAttachment.isPending;

  function thumbnailUrl(attachment: Attachment): string {
    const stamp = replacedAt[attachment.id];
    return stamp ? `${attachment.url}?v=${stamp}` : attachment.url;
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const reason = attachmentError(file, limits);
        if (reason) {
          setError(reason);
          continue;
        }
        await uploadAttachment.mutateAsync({ issueId, file });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const { draggedFiles, dragHandlers } = useFileDragZone((files) => void upload(files));

  return (
    <div className="relative" {...(readOnly ? {} : dragHandlers)}>
      <div className="mb-3 flex h-7 items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t('title')}</h3>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5"
            disabled={uploading}
            title={attachmentLimitHint(limits)}
            onClick={() => fileInput.current?.click()}
          >
            <Plus className="size-4" />
            {uploading ? t('uploading') : t('add')}
          </Button>
        )}
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={attachmentAccept(limits)}
          className="hidden"
          onChange={(event) => void upload(event.target.files)}
        />
      </div>

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          {readOnly ? t('empty') : t('emptyHint')}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
          {items.map((attachment) => (
            <IssueAttachmentCard
              key={attachment.id}
              attachment={attachment}
              thumbnailUrl={thumbnailUrl(attachment)}
              onOpen={() => setViewing(attachment)}
              onInsert={() => onInsert(attachment)}
              onAnnotate={() => setAnnotating(attachment)}
              onDelete={() => deleteAttachment.mutate(attachment.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {viewing && <AttachmentViewer attachment={viewing} onClose={() => setViewing(null)} />}

      {annotating && (
        <IssueImageAnnotator
          src={annotating.url}
          savedName={baseName(annotating.filename)}
          onSave={(file) => {
            const publicId = annotating.id;
            setError(null);
            replaceAttachment.mutate(
              { publicId, file },
              {
                onSuccess: () => {
                  setReplacedAt((previous) => ({ ...previous, [publicId]: Date.now() }));
                  onReplaced();
                },
                onError: (err) => setError(err.message),
              },
            );
            setAnnotating(null);
          }}
          onClose={() => setAnnotating(null)}
        />
      )}

      {draggedFiles !== null && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-background/80 text-primary backdrop-blur-sm">
          <Download className="size-6" />
          <span className="text-sm font-medium">{t('dropToUpload')}</span>
        </div>
      )}
    </div>
  );
}
