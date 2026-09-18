import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IssueRef, IssueRelations } from '@/lib/api/endpoints/issues';
import {
  canSelectIssueParent,
  excludeParentCandidate,
  parentSelectionVars,
} from './parentSelection';

const ref = (id: number): IssueRef => ({
  id,
  sequenceNumber: id,
  identifier: `TEST-${id}`,
  title: `Issue ${id}`,
  columnId: 1,
  typeId: null,
  archived: false,
});

const issue = (
  input: Partial<Pick<IssueRelations, 'id' | 'parent' | 'subtasks'>> = {},
): Pick<IssueRelations, 'id' | 'parent' | 'subtasks'> => ({
  id: 10,
  parent: null,
  subtasks: [],
  ...input,
});

describe('parent selection', () => {
  it('allows an editor to set or change the parent of a leaf issue', () => {
    assert.equal(canSelectIssueParent(issue(), true), true);
    assert.equal(canSelectIssueParent(issue({ parent: ref(4) }), true), true);
  });

  it('does not offer selection for an issue with children or a read-only issue', () => {
    assert.equal(canSelectIssueParent(issue({ subtasks: [ref(11)] }), true), false);
    assert.equal(canSelectIssueParent(issue(), false), false);
  });

  it('excludes the current issue and issues that already have a parent', () => {
    assert.equal(excludeParentCandidate(10, { id: 10, parentId: null }), true);
    assert.equal(excludeParentCandidate(10, { id: 11, parentId: 10 }), true);
    assert.equal(excludeParentCandidate(10, { id: 12, parentId: null }), false);
  });

  it('builds the initial parent assignment variables', () => {
    assert.deepEqual(parentSelectionVars('TEST', issue(), 20), {
      projectKey: 'TEST',
      issueId: 10,
      parentId: 20,
      previousParentId: null,
    });
  });

  it('includes the previous parent when changing parents', () => {
    assert.deepEqual(parentSelectionVars('TEST', issue({ parent: ref(4) }), 20), {
      projectKey: 'TEST',
      issueId: 10,
      parentId: 20,
      previousParentId: 4,
    });
  });
});
