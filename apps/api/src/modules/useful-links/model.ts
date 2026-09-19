import { t } from 'elysia';

export const MAX_USEFUL_LINK_URL_LENGTH = 4096;

export const issueUsefulLinkParams = t.Object({ issueId: t.Numeric() });
export const usefulLinkParams = t.Object({ usefulLinkId: t.Numeric() });

export const UsefulLinkResponse = t.Object({
  id: t.Number(),
  url: t.String(),
  createdAt: t.String(),
});

export const UsefulLinkListResponse = t.Array(UsefulLinkResponse);

export const createUsefulLinkBody = t.Object({
  url: t.String({
    description: `Absolute HTTP or HTTPS URL, up to ${MAX_USEFUL_LINK_URL_LENGTH} characters after normalization.`,
  }),
});
