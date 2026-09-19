import { Elysia } from 'elysia';
import { authContext } from '#shared/auth-context';
import { requireUser } from '#shared/access';
import { guards } from '#shared/guards';
import { HttpError, rethrowDuplicate } from '#shared/lib';
import { paginate } from '#shared/pagination';
import { accessErrors, commonErrors, errors } from '#shared/responses';
import {
  RecurringIssueOccurrencePageResponse,
  RecurringIssuePageResponse,
  RecurringIssueResponse,
  recurringIssueBody,
  recurringIssuePageQuery,
  recurringIssueParams,
  updateRecurringIssueBody,
} from './model';
import {
  createRecurringIssue,
  getRecurringIssue,
  listRecurringIssueOccurrences,
  listRecurringIssues,
  setRecurringIssueStatus,
  updateRecurringIssue,
} from './service';

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new HttpError(400, `${field} is required`);
  return trimmed;
}

export const recurringIssueRoutes = new Elysia({
  name: 'recurring-issues',
  detail: { tags: ['Recurring Issues'] },
})
  .use(authContext)
  .use(guards)
  .get(
    '/projects/:projectKey/recurring-issues',
    ({ project, query }) => paginate(query, (window) => listRecurringIssues(project.id, window)),
    {
      query: recurringIssuePageQuery,
      permission: ['recurring_issues', 'read'],
      response: { 200: RecurringIssuePageResponse, ...accessErrors },
      detail: { summary: 'List recurring issues' },
    },
  )
  .get(
    '/projects/:projectKey/recurring-issues/:recurringIssueId',
    async ({ project, params }) => {
      const row = await getRecurringIssue(project.id, params.recurringIssueId);
      if (!row) throw new HttpError(404, 'Recurring issue not found');
      return row;
    },
    {
      params: recurringIssueParams,
      permission: ['recurring_issues', 'read'],
      response: { 200: RecurringIssueResponse, ...accessErrors },
      detail: { summary: 'Get a recurring issue' },
    },
  )
  .post(
    '/projects/:projectKey/recurring-issues',
    async ({ project, body, user, set }) => {
      try {
        const row = await createRecurringIssue(project.id, requireUser(user).id, {
          ...body,
          name: required(body.name, 'Name'),
          title: required(body.title, 'Title'),
        });
        set.status = 201;
        return row;
      } catch (error) {
        rethrowDuplicate(error, 'recurring issue');
      }
    },
    {
      body: recurringIssueBody,
      permission: ['recurring_issues', 'create'],
      response: { 201: RecurringIssueResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Create a recurring issue' },
    },
  )
  .patch(
    '/projects/:projectKey/recurring-issues/:recurringIssueId',
    async ({ project, params, body }) => {
      try {
        const row = await updateRecurringIssue(project.id, params.recurringIssueId, {
          ...body,
          ...(body.name !== undefined ? { name: required(body.name, 'Name') } : {}),
          ...(body.title !== undefined ? { title: required(body.title, 'Title') } : {}),
        });
        if (!row) throw new HttpError(404, 'Recurring issue not found');
        return row;
      } catch (error) {
        rethrowDuplicate(error, 'recurring issue');
      }
    },
    {
      params: recurringIssueParams,
      body: updateRecurringIssueBody,
      permission: ['recurring_issues', 'edit'],
      response: { 200: RecurringIssueResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Update a recurring issue' },
    },
  )
  .post(
    '/projects/:projectKey/recurring-issues/:recurringIssueId/pause',
    async ({ project, params }) => {
      const row = await setRecurringIssueStatus(project.id, params.recurringIssueId, 'paused');
      if (!row) throw new HttpError(404, 'Recurring issue not found');
      return row;
    },
    {
      params: recurringIssueParams,
      permission: ['recurring_issues', 'edit'],
      response: { 200: RecurringIssueResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Pause a recurring issue' },
    },
  )
  .post(
    '/projects/:projectKey/recurring-issues/:recurringIssueId/resume',
    async ({ project, params }) => {
      const row = await setRecurringIssueStatus(project.id, params.recurringIssueId, 'active');
      if (!row) throw new HttpError(404, 'Recurring issue not found');
      return row;
    },
    {
      params: recurringIssueParams,
      permission: ['recurring_issues', 'edit'],
      response: { 200: RecurringIssueResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Resume a recurring issue' },
    },
  )
  .post(
    '/projects/:projectKey/recurring-issues/:recurringIssueId/cancel',
    async ({ project, params }) => {
      const row = await setRecurringIssueStatus(project.id, params.recurringIssueId, 'cancelled');
      if (!row) throw new HttpError(404, 'Recurring issue not found');
      return row;
    },
    {
      params: recurringIssueParams,
      permission: ['recurring_issues', 'delete'],
      response: { 200: RecurringIssueResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Cancel a recurring issue' },
    },
  )
  .get(
    '/projects/:projectKey/recurring-issues/:recurringIssueId/occurrences',
    async ({ project, params, query }) => {
      const page = await paginate(query, (window) =>
        listRecurringIssueOccurrences(project.id, params.recurringIssueId, window).then((value) => {
          if (!value) throw new HttpError(404, 'Recurring issue not found');
          return value;
        }),
      );
      return page;
    },
    {
      params: recurringIssueParams,
      query: recurringIssuePageQuery,
      permission: ['recurring_issues', 'read'],
      response: { 200: RecurringIssueOccurrencePageResponse, ...accessErrors },
      detail: { summary: 'List recurring issue occurrences' },
    },
  );
