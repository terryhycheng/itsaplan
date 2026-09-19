import { Elysia, t } from 'elysia';
import { authContext } from '#shared/auth-context';
import { entityGuard } from '#shared/guards';
import { noContent } from '#shared/http';
import { HttpError } from '#shared/lib';
import { commonErrors, errors } from '#shared/responses';
import { getIssueProjectId } from '#modules/issues/service';
import {
  createUsefulLinkBody,
  issueUsefulLinkParams,
  MAX_USEFUL_LINK_URL_LENGTH,
  UsefulLinkListResponse,
  usefulLinkParams,
  UsefulLinkResponse,
} from './model';
import {
  createUsefulLink,
  deleteUsefulLink,
  getUsefulLinkProjectId,
  listUsefulLinks,
} from './service';

export function normalizeUsefulLinkUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new HttpError(400, 'URL must be an absolute HTTP or HTTPS URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpError(400, 'URL must use HTTP or HTTPS');
  }
  if (url.username || url.password) {
    throw new HttpError(400, 'URL must not contain credentials');
  }

  const canonical = url.href;
  if (canonical.length > MAX_USEFUL_LINK_URL_LENGTH) {
    throw new HttpError(400, `URL must be at most ${MAX_USEFUL_LINK_URL_LENGTH} characters`);
  }
  return canonical;
}

export const usefulLinkRoutes = new Elysia({
  name: 'useful-links',
  detail: { tags: ['Useful Links'] },
})
  .use(authContext)
  .macro({
    issueUsefulLink: entityGuard('work_items', 'Issue not found', (params) =>
      getIssueProjectId(Number(params.issueId)),
    ),
    usefulLink: entityGuard('work_items', 'Useful link not found', (params) =>
      getUsefulLinkProjectId(Number(params.usefulLinkId)),
    ),
  })
  .get('/issues/:issueId/useful-links', ({ params }) => listUsefulLinks(params.issueId), {
    params: issueUsefulLinkParams,
    issueUsefulLink: 'read',
    response: { 200: UsefulLinkListResponse, ...commonErrors },
    detail: { summary: 'List useful links' },
  })
  .post(
    '/issues/:issueId/useful-links',
    ({ params, body, set }) => {
      set.status = 201;
      return createUsefulLink({ issueId: params.issueId, url: normalizeUsefulLinkUrl(body.url) });
    },
    {
      params: issueUsefulLinkParams,
      body: createUsefulLinkBody,
      issueUsefulLink: 'edit',
      response: { 201: UsefulLinkResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Create a useful link' },
    },
  )
  .delete(
    '/useful-links/:usefulLinkId',
    async ({ params }) => {
      await deleteUsefulLink(params.usefulLinkId);
      return noContent();
    },
    {
      params: usefulLinkParams,
      usefulLink: 'edit',
      response: { 204: t.Void(), ...commonErrors },
      detail: { summary: 'Delete a useful link' },
    },
  );
