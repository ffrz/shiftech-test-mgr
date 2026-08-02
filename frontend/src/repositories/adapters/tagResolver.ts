import { tagRepositoryAdapter as supabase } from './supabase/tagRepository';
import { createMockTagRepository } from './mock/tagRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { TagRepository } from '../interfaces/tagRepository';

export const tagRepositoryAdapter: TagRepository = createDataSourceResolver<TagRepository>({
  supabase,
  mock: createMockTagRepository(),
});
