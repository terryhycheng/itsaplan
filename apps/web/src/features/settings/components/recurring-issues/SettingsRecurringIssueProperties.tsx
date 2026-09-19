import { useTranslations } from 'next-intl';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import AssigneeSelect from '@/components/common/fields/AssigneeSelect';
import CustomFieldPill from '@/components/common/fields/CustomFieldPill';
import InitiativeSelect from '@/components/common/fields/InitiativeSelect';
import LabelsSelect from '@/components/common/fields/LabelsSelect';
import PrioritySelect from '@/components/common/fields/PrioritySelect';
import StatusSelect from '@/components/common/fields/StatusSelect';
import TypeSelect from '@/components/common/fields/TypeSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RecurringIssueFormValues } from '../../utils/recurringIssueForm';

export default function SettingsRecurringIssueProperties({
  project,
  values,
  onChange,
}: {
  project: ProjectDetail;
  values: RecurringIssueFormValues;
  onChange: (patch: Partial<RecurringIssueFormValues>) => void;
}) {
  const t = useTranslations('settings.recurringIssues');
  const tFields = useTranslations('issue.fields');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusSelect
          columns={project.columns}
          value={values.columnId}
          onChange={(columnId) => onChange({ columnId })}
        />
        {project.issueTypes.length > 0 && (
          <TypeSelect
            issueTypes={project.issueTypes}
            value={values.typeId ?? null}
            onChange={(typeId) =>
              onChange({
                typeId,
                fieldValues: values.fieldValues?.filter((value) => {
                  const field = project.customFields.find((item) => item.id === value.fieldId);
                  return field?.issueTypeId == null || field.issueTypeId === typeId;
                }),
              })
            }
          />
        )}
        {project.assignees.some((assignee) => assignee.kind === 'member') && (
          <AssigneeSelect
            assignees={project.assignees.filter((assignee) => assignee.kind === 'member')}
            value={values.assigneeUserId ?? null}
            onChange={(assigneeUserId) => onChange({ assigneeUserId })}
            placeholder={tFields('assignee')}
          />
        )}
        {project.assignees.some((assignee) => assignee.kind === 'agent') && (
          <AssigneeSelect
            assignees={project.assignees.filter((assignee) => assignee.kind === 'agent')}
            value={values.delegateUserId ?? null}
            onChange={(delegateUserId) => onChange({ delegateUserId })}
            placeholder={tFields('delegate')}
          />
        )}
        <PrioritySelect
          value={values.priority ?? ''}
          onChange={(priority) => onChange({ priority })}
        />
        <InitiativeSelect
          projectKey={project.project.key}
          value={values.initiativeId ?? null}
          onChange={(initiativeId) => onChange({ initiativeId })}
        />
        {project.labels.length > 0 && (
          <LabelsSelect
            labels={project.labels}
            groups={project.labelGroups}
            value={values.labelIds ?? []}
            onToggle={(id) =>
              onChange({
                labelIds: values.labelIds?.includes(id)
                  ? values.labelIds.filter((value) => value !== id)
                  : [...(values.labelIds ?? []), id],
              })
            }
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="recurring-points">{t('points')}</Label>
          <Input
            id="recurring-points"
            type="number"
            min={0}
            value={values.estimatePoints ?? ''}
            onChange={(event) =>
              onChange({ estimatePoints: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-minutes">{t('minutes')}</Label>
          <Input
            id="recurring-minutes"
            type="number"
            min={0}
            value={values.estimateMinutes ?? ''}
            onChange={(event) =>
              onChange({ estimateMinutes: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-start-offset">{t('startOffset')}</Label>
          <Input
            id="recurring-start-offset"
            type="number"
            value={values.startOffsetDays ?? ''}
            onChange={(event) =>
              onChange({ startOffsetDays: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurring-due-offset">{t('dueOffset')}</Label>
          <Input
            id="recurring-due-offset"
            type="number"
            value={values.dueOffsetDays ?? ''}
            onChange={(event) =>
              onChange({ dueOffsetDays: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
      </div>
      {project.customFields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.customFields
            .filter((field) => field.issueTypeId == null || field.issueTypeId === values.typeId)
            .map((field) => {
              const current = values.fieldValues?.find((value) => value.fieldId === field.id);
              return (
                <CustomFieldPill
                  key={field.id}
                  def={field}
                  value={current}
                  assignees={project.assignees}
                  onChange={(value) =>
                    onChange({
                      fieldValues: [
                        ...(values.fieldValues ?? []).filter((item) => item.fieldId !== field.id),
                        { fieldId: field.id, ...value },
                      ],
                    })
                  }
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
