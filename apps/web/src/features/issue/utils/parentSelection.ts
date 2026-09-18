import type { IssueRelations, IssueSearchHit } from '@/lib/api/endpoints/issues';

type ParentSelectionIssue = Pick<IssueRelations, 'id' | 'parent' | 'subtasks'>;

export function canSelectIssueParent(issue: ParentSelectionIssue, canEdit: boolean): boolean {
  return canEdit && issue.subtasks.length === 0;
}

export function excludeParentCandidate(
  issueId: number,
  hit: Pick<IssueSearchHit, 'id' | 'parentId'>,
): boolean {
  return hit.id === issueId || hit.parentId !== null;
}

export function parentSelectionVars(
  projectKey: string,
  issue: ParentSelectionIssue,
  parentId: number,
) {
  return {
    projectKey,
    issueId: issue.id,
    parentId,
    previousParentId: issue.parent?.id ?? null,
  };
}
