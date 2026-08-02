import type { Attachment, ExternalLink, Issue, IssuePriority, IssueStatus, IssueType, IssueWithDetails } from '../../types/domain';

export interface IssueRepository {
  searchByProject(projectId: string, query: string, limit?: number): Promise<Pick<Issue, 'id' | 'code' | 'title'>[]>;
  findByCode(projectId: string, code: string): Promise<Issue | null>;
  findById(id: string): Promise<IssueWithDetails | null>;
  findAllByProjectPaginated(
    projectId: string,
    options: {
      search?: string;
      statuses?: IssueStatus[];
      priorities?: IssuePriority[];
      moduleIds?: string[];
      tagIds?: string[];
      types?: IssueType[];
      testRoleIds?: string[];
      page: number;
      pageSize: number;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ data: IssueWithDetails[]; total: number }>;
  findAllByProject(
    projectId: string,
    options?: { search?: string; statuses?: IssueStatus[]; priorities?: IssuePriority[]; moduleIds?: string[]; limit?: number },
  ): Promise<IssueWithDetails[]>;
  findAllByTestRun(testRunId: string): Promise<IssueWithDetails[]>;
  findAllByTestResult(testResultId: string): Promise<IssueWithDetails[]>;
  create(input: {
    projectId: string;
    moduleId: string | null;
    type: IssueType;
    code?: string | null;
    title: string;
    description: string | null;
    actualResult: string | null;
    expectedResult: string | null;
    priority: IssuePriority;
    status: IssueStatus;
    assignedTo: string | null;
    targetRoleId?: string | null;
    externalLinks: ExternalLink[];
    createdBy?: string | null;
  }): Promise<Issue>;
  createMany(
    inputs: {
      projectId: string;
      moduleId: string | null;
      type: IssueType;
      title: string;
      description: string | null;
      actualResult: string | null;
      expectedResult: string | null;
      priority: IssuePriority;
      status: IssueStatus;
      assignedTo: string | null;
      targetRoleId?: string | null;
      externalLinks: ExternalLink[];
      createdBy?: string | null;
    }[],
  ): Promise<Issue[]>;
  update(
    id: string,
    changes: Partial<
      Pick<Issue, 'code' | 'title' | 'description' | 'actualResult' | 'expectedResult' | 'priority' | 'type' | 'moduleId' | 'targetRoleId' | 'externalLinks'>
    >,
  ): Promise<Issue>;
  updateStatus(id: string, status: IssueStatus): Promise<Issue>;
  assign(id: string, assignedTo: string | null): Promise<Issue>;
  remove(id: string): Promise<void>;
  linkToTestResult(issueId: string, testResultId: string): Promise<void>;
  unlinkFromTestResult(issueId: string, testResultId: string): Promise<void>;
  replaceTags(issueId: string, tagIds: string[]): Promise<void>;
  findAttachments(issueId: string): Promise<Attachment[]>;
  addAttachment(input: {
    issueId: string;
    projectId: string;
    storageProvider: string;
    url: string;
    fileName: string;
    fileSize: number | null;
    contentType: string | null;
  }): Promise<Attachment>;
  removeAttachment(id: string): Promise<void>;
}
