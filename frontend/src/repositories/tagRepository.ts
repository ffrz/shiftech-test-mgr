import { tagRepositoryAdapter } from './adapters/tagResolver';
import type { TagRepository } from './interfaces/tagRepository';

export const tagRepository: TagRepository = tagRepositoryAdapter;
