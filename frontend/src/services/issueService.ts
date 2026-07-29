import { issueRepository } from '../repositories/issueRepository';
import { tagService } from './tagService';
import type { ExternalLink, Issue, IssuePriority, IssueType } from '../types/domain';

export const issueService = {
  getById(id: string) {
    return issueRepository.findById(id);
  },

  listByProject(
    projectId: string,
    options?: { search?: string; statuses?: Issue['status'][]; priorities?: Issue['priority'][]; moduleIds?: string[]; limit?: number },
  ) {
    return issueRepository.findAllByProject(projectId, options);
  },

  listByProjectPaginated(
    projectId: string,
    options: {
      search?: string;
      statuses?: Issue['status'][];
      priorities?: Issue['priority'][];
      moduleIds?: string[];
      tagIds?: string[];
      types?: IssueType[];
      page: number;
      pageSize: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    return issueRepository.findAllByProjectPaginated(projectId, options);
  },

  listByTestRun(testRunId: string) {
    return issueRepository.findAllByTestRun(testRunId);
  },

  listByTestResult(testResultId: string) {
    return issueRepository.findAllByTestResult(testResultId);
  },

  async create(input: {
    projectId: string;
    moduleId?: string | null;
    type?: IssueType;
    title: string;
    description?: string;
    actualResult?: string;
    expectedResult?: string;
    priority?: IssuePriority;
    externalLinks?: ExternalLink[];
    tagNames?: string[];
    // If given, the created issue is immediately linked to this test result — used by the
    // "create new inline" flow in the Test Run Link Issue dialog.
    linkToTestResultId?: string;
  }): Promise<Issue> {
    if (!input.title.trim()) throw new Error('Issue title cannot be empty');

    const issue = await issueRepository.create({
      projectId: input.projectId,
      moduleId: input.moduleId ?? null,
      type: input.type ?? 'bug',
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority ?? 'medium',
      status: 'open',
      assignedTo: null,
      externalLinks: input.externalLinks ?? [],
    });

    if (input.tagNames?.length) {
      await tagService.saveTagsForIssue(input.projectId, issue.id, input.tagNames);
    }

    if (input.linkToTestResultId) {
      await issueRepository.linkToTestResult(issue.id, input.linkToTestResultId);
    }

    return issue;
  },

  async update(
    id: string,
    projectId: string,
    input: {
      title: string;
      description?: string;
      actualResult?: string;
      expectedResult?: string;
      priority: IssuePriority;
      type: IssueType;
      moduleId: string | null;
      externalLinks: ExternalLink[];
    },
    tagNames?: string[],
  ) {
    if (!input.title.trim()) throw new Error('Issue title cannot be empty');
    const issue = await issueRepository.update(id, {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority,
      type: input.type,
      moduleId: input.moduleId,
      externalLinks: input.externalLinks,
    });
    if (tagNames !== undefined) {
      await tagService.saveTagsForIssue(projectId, id, tagNames);
    }
    return issue;
  },

  async patchField(
    id: string,
    changes: Partial<Pick<Issue, 'title' | 'priority' | 'type' | 'moduleId'>>,
  ) {
    if (changes.title !== undefined && !changes.title.trim()) {
      throw new Error('Issue title cannot be empty');
    }
    return issueRepository.update(id, changes.title !== undefined ? { ...changes, title: changes.title.trim() } : changes);
  },

  changeStatus: issueRepository.updateStatus,
  assign: issueRepository.assign,
  remove: issueRepository.remove,

  linkToTestResult: issueRepository.linkToTestResult,
  unlinkFromTestResult: issueRepository.unlinkFromTestResult,

  listAttachments: issueRepository.findAttachments,
  removeAttachment: issueRepository.removeAttachment,
};
