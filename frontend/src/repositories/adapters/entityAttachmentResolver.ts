import { entityAttachmentRepositoryAdapter as supabase } from './supabase/entityAttachmentRepository';
import { createMockEntityAttachmentRepository } from './mock/entityAttachmentRepository';
import { createDataSourceResolver } from './createDataSourceResolver';
import type { EntityAttachmentRepository } from '../interfaces/entityAttachmentRepository';

export const entityAttachmentRepositoryAdapter: EntityAttachmentRepository = createDataSourceResolver<EntityAttachmentRepository>({
  supabase,
  mock: createMockEntityAttachmentRepository(),
});
