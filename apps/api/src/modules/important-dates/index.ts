import { Elysia, t } from 'elysia';
import { authContext } from '#shared/auth-context';
import { entityGuard, guards } from '#shared/guards';
import { noContent } from '#shared/http';
import { HttpError } from '#shared/lib';
import { accessErrors, commonErrors } from '#shared/responses';
import {
  ImportantDateListResponse,
  ImportantDateResponse,
  MAX_IMPORTANT_DATE_NAME_LENGTH,
  createImportantDateBody,
  importantDateParams,
  updateImportantDateBody,
} from './model';
import {
  createImportantDate,
  deleteImportantDate,
  getImportantDateProjectId,
  listImportantDates,
  updateImportantDate,
} from './service';

function normalizeName(name: string): string {
  const value = name.trim();
  if (!value) throw new HttpError(400, 'Important date name is required');
  if (value.length > MAX_IMPORTANT_DATE_NAME_LENGTH) {
    throw new HttpError(
      400,
      `Important date name must be ${MAX_IMPORTANT_DATE_NAME_LENGTH} characters or fewer`,
    );
  }
  return value;
}

function validDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, "Date must be a calendar day, 'YYYY-MM-DD'");
  }
  return value;
}

export const importantDateRoutes = new Elysia({
  name: 'important-dates',
  detail: { tags: ['Important Dates'] },
})
  .use(authContext)
  .use(guards)
  .macro({
    importantDate: entityGuard('workflow_config', 'Important date not found', (params) =>
      getImportantDateProjectId(Number(params.importantDateId)),
    ),
  })
  .get('/projects/:projectKey/important-dates', ({ project }) => listImportantDates(project.id), {
    permission: ['work_items', 'read'],
    response: { 200: ImportantDateListResponse, ...accessErrors },
    detail: { summary: "List a project's important dates" },
  })
  .post(
    '/projects/:projectKey/important-dates',
    ({ project, body, set }) => {
      set.status = 201;
      return createImportantDate({
        projectId: project.id,
        ...body,
        name: normalizeName(body.name),
        date: validDate(body.date),
      });
    },
    {
      body: createImportantDateBody,
      permission: ['workflow_config', 'edit'],
      response: { 201: ImportantDateResponse, ...commonErrors },
      detail: { summary: 'Create an important date' },
    },
  )
  .patch(
    '/important-dates/:importantDateId',
    async ({ params, body }) => {
      const importantDate = await updateImportantDate(params.importantDateId, {
        ...body,
        ...(body.name === undefined ? {} : { name: normalizeName(body.name) }),
        ...(body.date === undefined ? {} : { date: validDate(body.date) }),
      });
      if (!importantDate) throw new HttpError(404, 'Important date not found');
      return importantDate;
    },
    {
      params: importantDateParams,
      body: updateImportantDateBody,
      importantDate: 'edit',
      response: { 200: ImportantDateResponse, ...commonErrors },
      detail: { summary: 'Update an important date' },
    },
  )
  .delete(
    '/important-dates/:importantDateId',
    async ({ params }) => {
      await deleteImportantDate(params.importantDateId);
      return noContent();
    },
    {
      params: importantDateParams,
      importantDate: 'edit',
      response: { 204: t.Void(), ...commonErrors },
      detail: { summary: 'Delete an important date' },
    },
  );
