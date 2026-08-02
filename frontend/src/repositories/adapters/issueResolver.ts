import { issueRepositoryAdapter as supabase } from './supabase/issueRepository';
import { createMockIssueRepository } from './mock/issueRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { IssueRepository } from '../interfaces/issueRepository';

export const issueRepositoryAdapter: IssueRepository = createDataSourceResolver<IssueRepository>({
  supabase,
  mock: createMockIssueRepository(),
});
