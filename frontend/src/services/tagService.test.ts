import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Tag } from '../types/domain';

vi.mock('../repositories/tagRepository', () => ({
  tagRepository: {
    findAllByProject: vi.fn(),
    findTagsForTestCase: vi.fn(),
    findOrCreate: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findOrCreateMany: vi.fn(),
    setTagsForTestCase: vi.fn(),
    insertTestCaseTags: vi.fn(),
    insertIssueTags: vi.fn(),
  },
}));
vi.mock('../repositories/issueRepository', () => ({
  issueRepository: { replaceTags: vi.fn() },
}));

const { tagRepository } = await import('../repositories/tagRepository');
const { issueRepository } = await import('../repositories/issueRepository');
const { tagService } = await import('./tagService');

function makeTag(id: string, name: string): Tag {
  return { id, projectId: 'proj-1', name, createdAt: '2026-01-01T00:00:00Z' };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tagService.create / rename', () => {
  it('rejects an empty tag name on create', () => {
    expect(() => tagService.create('proj-1', '   ')).toThrow('Tag name cannot be empty');
    expect(tagRepository.findOrCreate).not.toHaveBeenCalled();
  });

  it('trims the tag name before find-or-create', async () => {
    vi.mocked(tagRepository.findOrCreate).mockResolvedValue(makeTag('t1', 'smoke'));

    await tagService.create('proj-1', '  smoke  ');

    expect(tagRepository.findOrCreate).toHaveBeenCalledWith('proj-1', 'smoke');
  });

  it('rejects an empty tag name on rename', () => {
    expect(() => tagService.rename('t1', ' ')).toThrow('Tag name cannot be empty');
    expect(tagRepository.update).not.toHaveBeenCalled();
  });

  it('trims the tag name on rename', async () => {
    vi.mocked(tagRepository.update).mockResolvedValue(makeTag('t1', 'smoke'));
    await tagService.rename('t1', '  smoke  ');
    expect(tagRepository.update).toHaveBeenCalledWith('t1', 'smoke');
  });
});

describe('tagService passthrough ops', () => {
  it('delegates listByProject', async () => {
    vi.mocked(tagRepository.findAllByProject).mockResolvedValue([makeTag('t1', 'smoke')]);
    const result = await tagService.listByProject('proj-1');
    expect(tagRepository.findAllByProject).toHaveBeenCalledWith('proj-1');
    expect(result).toHaveLength(1);
  });

  it('delegates listForTestCase', async () => {
    vi.mocked(tagRepository.findTagsForTestCase).mockResolvedValue([makeTag('t1', 'smoke')]);
    const result = await tagService.listForTestCase('tc-1');
    expect(tagRepository.findTagsForTestCase).toHaveBeenCalledWith('tc-1');
    expect(result).toHaveLength(1);
  });

  it('delegates remove', async () => {
    vi.mocked(tagRepository.remove).mockResolvedValue(undefined);
    await tagService.remove('t1');
    expect(tagRepository.remove).toHaveBeenCalledWith('t1');
  });
});

describe('tagService.saveTagsForTestCase', () => {
  it('dedups, trims and filters empty names before resolving tags once each', async () => {
    vi.mocked(tagRepository.findOrCreate)
      .mockResolvedValueOnce(makeTag('t-smoke', 'smoke'))
      .mockResolvedValueOnce(makeTag('t-auth', 'auth'));

    await tagService.saveTagsForTestCase('proj-1', 'tc-1', [' smoke ', 'smoke', '', '  ', 'auth']);

    expect(tagRepository.findOrCreate).toHaveBeenCalledTimes(2);
    expect(tagRepository.findOrCreate).toHaveBeenNthCalledWith(1, 'proj-1', 'smoke');
    expect(tagRepository.findOrCreate).toHaveBeenNthCalledWith(2, 'proj-1', 'auth');
    expect(tagRepository.setTagsForTestCase).toHaveBeenCalledWith('tc-1', ['t-smoke', 't-auth']);
  });

  it('reuses an existing tag id instead of creating it again (repository find-or-create)', async () => {
    vi.mocked(tagRepository.findOrCreate).mockResolvedValue(makeTag('t-smoke', 'smoke'));

    await tagService.saveTagsForTestCase('proj-1', 'tc-1', ['smoke', 'smoke']);

    expect(tagRepository.findOrCreate).toHaveBeenCalledTimes(1);
    expect(tagRepository.setTagsForTestCase).toHaveBeenCalledWith('tc-1', ['t-smoke']);
  });

  it('clears the tag set (full-replace) when no tag names are given', async () => {
    await tagService.saveTagsForTestCase('proj-1', 'tc-1', []);

    expect(tagRepository.findOrCreate).not.toHaveBeenCalled();
    expect(tagRepository.setTagsForTestCase).toHaveBeenCalledWith('tc-1', []);
  });
});

describe('tagService.saveTagsForIssue', () => {
  it('dedups and trims names, then replaces the issue tag set', async () => {
    vi.mocked(tagRepository.findOrCreate)
      .mockResolvedValueOnce(makeTag('t-ui', 'ui'))
      .mockResolvedValueOnce(makeTag('t-bug', 'bug'));

    await tagService.saveTagsForIssue('proj-1', 'iss-1', ['ui', ' ui ', 'bug']);

    expect(tagRepository.findOrCreate).toHaveBeenCalledTimes(2);
    expect(issueRepository.replaceTags).toHaveBeenCalledWith('iss-1', ['t-ui', 't-bug']);
  });
});

describe('tagService.saveTagsForTestCaseMany', () => {
  it('returns early without querying the repository when no item carries tags', async () => {
    await tagService.saveTagsForTestCaseMany('proj-1', [
      { testCaseId: 'tc-1', tagNames: [] },
      { testCaseId: 'tc-2', tagNames: [] },
    ]);

    expect(tagRepository.findOrCreateMany).not.toHaveBeenCalled();
    expect(tagRepository.insertTestCaseTags).not.toHaveBeenCalled();
  });

  it('returns early when every supplied name is blank', async () => {
    await tagService.saveTagsForTestCaseMany('proj-1', [{ testCaseId: 'tc-1', tagNames: ['  '] }]);

    expect(tagRepository.findOrCreateMany).not.toHaveBeenCalled();
  });

  it('dedups names across all items and inserts index-aligned junction rows', async () => {
    vi.mocked(tagRepository.findOrCreateMany).mockResolvedValue(
      new Map([
        ['smoke', makeTag('t-smoke', 'smoke')],
        ['auth', makeTag('t-auth', 'auth')],
      ]),
    );

    await tagService.saveTagsForTestCaseMany('proj-1', [
      { testCaseId: 'tc-1', tagNames: [' smoke', 'smoke'] },
      { testCaseId: 'tc-2', tagNames: ['auth'] },
    ]);

    expect(tagRepository.findOrCreateMany).toHaveBeenCalledWith('proj-1', ['smoke', 'auth']);
    expect(tagRepository.insertTestCaseTags).toHaveBeenCalledWith([
      { testCaseId: 'tc-1', tagId: 't-smoke' },
      { testCaseId: 'tc-1', tagId: 't-smoke' },
      { testCaseId: 'tc-2', tagId: 't-auth' },
    ]);
  });
});

describe('tagService.saveTagsForIssueMany', () => {
  it('returns early without querying the repository when no item carries tags', async () => {
    await tagService.saveTagsForIssueMany('proj-1', [{ issueId: 'iss-1', tagNames: [] }]);

    expect(tagRepository.findOrCreateMany).not.toHaveBeenCalled();
    expect(tagRepository.insertIssueTags).not.toHaveBeenCalled();
  });

  it('returns early when every supplied name is blank', async () => {
    await tagService.saveTagsForIssueMany('proj-1', [{ issueId: 'iss-1', tagNames: ['   '] }]);

    expect(tagRepository.findOrCreateMany).not.toHaveBeenCalled();
    expect(tagRepository.insertIssueTags).not.toHaveBeenCalled();
  });

  it('dedups names across all items and inserts index-aligned junction rows', async () => {
    vi.mocked(tagRepository.findOrCreateMany).mockResolvedValue(
      new Map([
        ['regression', makeTag('t-reg', 'regression')],
        ['ui', makeTag('t-ui', 'ui')],
      ]),
    );

    await tagService.saveTagsForIssueMany('proj-1', [
      { issueId: 'iss-1', tagNames: ['regression', 'ui'] },
      { issueId: 'iss-2', tagNames: ['ui', 'ui'] },
    ]);

    expect(tagRepository.findOrCreateMany).toHaveBeenCalledWith('proj-1', ['regression', 'ui']);
    expect(tagRepository.insertIssueTags).toHaveBeenCalledWith([
      { issueId: 'iss-1', tagId: 't-reg' },
      { issueId: 'iss-1', tagId: 't-ui' },
      { issueId: 'iss-2', tagId: 't-ui' },
      { issueId: 'iss-2', tagId: 't-ui' },
    ]);
  });
});
