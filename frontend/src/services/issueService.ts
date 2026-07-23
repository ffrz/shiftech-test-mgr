import { issueRepository } from '../repositories/issueRepository';
import { tagService } from './tagService';
import type { GithubLink, Issue, IssuePriority, IssueType } from '../types/domain';

export const issueService = {
  getById(id: string) {
    return issueRepository.findById(id);
  },

  listByProject(projectId: string, options?: { search?: string; limit?: number }) {
    return issueRepository.findAllByProject(projectId, options);
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
    githubLinks?: GithubLink[];
    tagNames?: string[];
    // If given, the created issue is immediately linked to this test result — used by the
    // "create new inline" flow in the Test Run Link Issue dialog.
    linkToTestResultId?: string;
  }): Promise<Issue> {
    if (!input.title.trim()) throw new Error('Judul issue tidak boleh kosong');

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
      githubLinks: input.githubLinks ?? [],
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
      githubLinks: GithubLink[];
    },
    tagNames?: string[],
  ) {
    if (!input.title.trim()) throw new Error('Judul issue tidak boleh kosong');
    const issue = await issueRepository.update(id, {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority,
      type: input.type,
      moduleId: input.moduleId,
      githubLinks: input.githubLinks,
    });
    if (tagNames !== undefined) {
      await tagService.saveTagsForIssue(projectId, id, tagNames);
    }
    return issue;
  },

  changeStatus: issueRepository.updateStatus,
  assign: issueRepository.assign,
  remove: issueRepository.remove,

  linkToTestResult: issueRepository.linkToTestResult,
  unlinkFromTestResult: issueRepository.unlinkFromTestResult,

  listAttachments: issueRepository.findAttachments,
  removeAttachment: issueRepository.removeAttachment,
};
