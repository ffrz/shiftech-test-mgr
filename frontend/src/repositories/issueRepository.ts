import { issueRepositoryAdapter } from './adapters/issueResolver';
import type { Attachment, ExternalLink, Issue, IssueStatus, IssueType, IssueWithDetails } from '../types/domain';

export const issueRepository = {
  searchByProject(projectId: string, query: string, limit?: number): Promise<Pick<Issue, 'id' | 'code' | 'title'>[]> {
    return issueRepositoryAdapter.searchByProject(projectId, query, limit);
  },

  findByCode(projectId: string, code: string): Promise<Issue | null> {
    return issueRepositoryAdapter.findByCode(projectId, code);
  },

  findById(id: string): Promise<IssueWithDetails | null> {
    return issueRepositoryAdapter.findById(id);
  },

  findAllByProjectPaginated(
    projectId: string,
    options: {
      search?: string;
      statuses?: IssueStatus[];
      priorities?: Issue['priority'][];
      moduleIds?: string[];
      tagIds?: string[];
      types?: IssueType[];
      testRoleIds?: string[];
      page: number;
      pageSize: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ data: IssueWithDetails[]; total: number }> {
    return issueRepositoryAdapter.findAllByProjectPaginated(projectId, options);
  },

  findAllByProject(
    projectId: string,
    options?: { search?: string; statuses?: IssueStatus[]; priorities?: Issue['priority'][]; moduleIds?: string[]; limit?: number },
  ): Promise<IssueWithDetails[]> {
    return issueRepositoryAdapter.findAllByProject(projectId, options);
  },

  findAllByTestRun(testRunId: string): Promise<IssueWithDetails[]> {
    return issueRepositoryAdapter.findAllByTestRun(testRunId);
  },

  findAllByTestResult(testResultId: string): Promise<IssueWithDetails[]> {
    return issueRepositoryAdapter.findAllByTestResult(testResultId);
  },

  create(input: {
    projectId: string;
    moduleId: string | null;
    type: IssueType;
    code?: string | null;
    title: string;
    description: string | null;
    actualResult: string | null;
    expectedResult: string | null;
    priority: Issue['priority'];
    status: IssueStatus;
    assignedTo: string | null;
    targetRoleId?: string | null;
    externalLinks: ExternalLink[];
    createdBy?: string | null;
  }): Promise<Issue> {
    return issueRepositoryAdapter.create(input);
  },

  createMany(
    inputs: {
      projectId: string;
      moduleId: string | null;
      type: IssueType;
      title: string;
      description: string | null;
      actualResult: string | null;
      expectedResult: string | null;
      priority: Issue['priority'];
      status: IssueStatus;
      assignedTo: string | null;
      targetRoleId?: string | null;
      externalLinks: ExternalLink[];
      createdBy?: string | null;
    }[],
  ): Promise<Issue[]> {
    return issueRepositoryAdapter.createMany(inputs);
  },

  update(
    id: string,
    changes: Partial<
      Pick<Issue, 'code' | 'title' | 'description' | 'actualResult' | 'expectedResult' | 'priority' | 'type' | 'moduleId' | 'targetRoleId' | 'externalLinks'>
    >,
  ): Promise<Issue> {
    return issueRepositoryAdapter.update(id, changes);
  },

  updateStatus(id: string, status: IssueStatus): Promise<Issue> {
    return issueRepositoryAdapter.updateStatus(id, status);
  },

  assign(id: string, assignedTo: string | null): Promise<Issue> {
    return issueRepositoryAdapter.assign(id, assignedTo);
  },

  remove(id: string): Promise<void> {
    return issueRepositoryAdapter.remove(id);
  },

  linkToTestResult(issueId: string, testResultId: string): Promise<void> {
    return issueRepositoryAdapter.linkToTestResult(issueId, testResultId);
  },

  unlinkFromTestResult(issueId: string, testResultId: string): Promise<void> {
    return issueRepositoryAdapter.unlinkFromTestResult(issueId, testResultId);
  },

  replaceTags(issueId: string, tagIds: string[]): Promise<void> {
    return issueRepositoryAdapter.replaceTags(issueId, tagIds);
  },

  findAttachments(issueId: string): Promise<Attachment[]> {
    return issueRepositoryAdapter.findAttachments(issueId);
  },

  addAttachment(input: {
    issueId: string;
    projectId: string;
    storageProvider: string;
    url: string;
    fileName: string;
    fileSize: number | null;
    contentType: string | null;
  }): Promise<Attachment> {
    return issueRepositoryAdapter.addAttachment(input);
  },

  removeAttachment(id: string): Promise<void> {
    return issueRepositoryAdapter.removeAttachment(id);
  },
};
