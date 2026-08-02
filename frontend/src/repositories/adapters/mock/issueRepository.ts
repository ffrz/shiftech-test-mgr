import type { Attachment, ExternalLink, Issue, IssueStatus, IssueType, IssueWithDetails } from '../../../types/domain';
import type { IssueRepository } from '../../interfaces/issueRepository';

let issueSeq = 0;
function nextIssueId(): string {
  issueSeq += 1;
  return `mock-issue-${issueSeq}`;
}

let attachmentSeq = 0;
function nextAttachmentId(): string {
  attachmentSeq += 1;
  return `mock-att-${attachmentSeq}`;
}

export function createMockIssueRepository(seed?: { issues?: Issue[] }): IssueRepository {
  const issueStore = new Map<string, Issue>(seed?.issues ? seed.issues.map((i) => [i.id, i]) : []);
  const issueTagStore = new Map<string, Set<string>>();
  const issueTestResultStore = new Map<string, Set<string>>();
  const attachmentStore = new Map<string, Attachment>();

  function toWithDetails(issue: Issue): IssueWithDetails {
    const tagIds = issueTagStore.get(issue.id);
    const tags = tagIds
      ? [...tagIds].map((tid) => ({
          id: tid,
          projectId: '',
          name: '',
          createdAt: '',
        }))
      : [];
    const resultIds = issueTestResultStore.get(issue.id);
    const linkedTestResults = resultIds ? [...resultIds].map((rid) => ({
      id: rid,
      testRunId: '',
      testCaseCode: null,
      testCaseTitle: '',
      testRun: null,
    })) : [];
    return {
      ...issue,
      assignee: null,
      module: null,
      targetRole: null,
      tags,
      linkedTestResults,
    };
  }

  function makeIssue(input: {
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
  }): Issue {
    const now = new Date().toISOString();
    return {
      id: nextIssueId(),
      code: input.code ?? '',
      projectId: input.projectId,
      moduleId: input.moduleId,
      type: input.type,
      title: input.title,
      description: input.description,
      actualResult: input.actualResult,
      expectedResult: input.expectedResult,
      priority: input.priority,
      status: input.status,
      assignedTo: input.assignedTo,
      targetRoleId: input.targetRoleId ?? null,
      externalLinks: input.externalLinks,
      createdBy: input.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    async searchByProject(projectId: string, query: string, limit = 5): Promise<Pick<Issue, 'id' | 'code' | 'title'>[]> {
      const sanitized = query.trim().replace(/^!/, '').replace(/[,()%*]/g, '');
      if (!sanitized) return [];
      const lower = sanitized.toLowerCase();
      const matches = [...issueStore.values()]
        .filter((i) => i.projectId === projectId)
        .filter((i) => i.code.toLowerCase().includes(lower) || i.title.toLowerCase().includes(lower))
        .slice(0, limit);
      return matches.map((i) => ({ id: i.id, code: i.code, title: i.title }));
    },

    async findByCode(projectId: string, code: string): Promise<Issue | null> {
      return [...issueStore.values()].find((i) => i.projectId === projectId && i.code === code) ?? null;
    },

    async findById(id: string): Promise<IssueWithDetails | null> {
      const issue = issueStore.get(id);
      if (!issue) return null;
      return toWithDetails(issue);
    },

    async findAllByProjectPaginated(
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
      let filtered = [...issueStore.values()].filter((i) => i.projectId === projectId);

      if (options.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        filtered = filtered.filter((i) => i.code.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
      }
      if (options.statuses?.length) {
        filtered = filtered.filter((i) => options.statuses!.includes(i.status));
      }
      if (options.priorities?.length) {
        filtered = filtered.filter((i) => options.priorities!.includes(i.priority));
      }
      if (options.moduleIds?.length) {
        filtered = filtered.filter((i) => i.moduleId && options.moduleIds!.includes(i.moduleId));
      }
      if (options.testRoleIds?.length) {
        filtered = filtered.filter((i) => i.targetRoleId && options.testRoleIds!.includes(i.targetRoleId));
      }
      if (options.tagIds?.length) {
        filtered = filtered.filter((i) => {
          const tagIds = issueTagStore.get(i.id);
          if (!tagIds) return false;
          return options.tagIds!.some((tid) => tagIds.has(tid));
        });
      }
      if (options.types?.length) {
        filtered = filtered.filter((i) => options.types!.includes(i.type));
      }

      const sortField = options.sortField ?? 'createdAt';
      const direction = options.sortOrder ?? 'desc';
      filtered.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortField];
        const bVal = (b as unknown as Record<string, unknown>)[sortField];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      const total = filtered.length;
      const from = (options.page - 1) * options.pageSize;
      const pageData = filtered.slice(from, from + options.pageSize);
      return { data: pageData.map(toWithDetails), total };
    },

    async findAllByProject(
      projectId: string,
      options?: { search?: string; statuses?: IssueStatus[]; priorities?: Issue['priority'][]; moduleIds?: string[]; limit?: number },
    ): Promise<IssueWithDetails[]> {
      let filtered = [...issueStore.values()].filter((i) => i.projectId === projectId);

      if (options?.search?.trim()) {
        const q = options.search.trim().toLowerCase();
        filtered = filtered.filter((i) => i.code.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
      }
      if (options?.statuses?.length) {
        filtered = filtered.filter((i) => options.statuses!.includes(i.status));
      }
      if (options?.priorities?.length) {
        filtered = filtered.filter((i) => options.priorities!.includes(i.priority));
      }
      if (options?.moduleIds?.length) {
        filtered = filtered.filter((i) => i.moduleId && options.moduleIds!.includes(i.moduleId));
      }
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return filtered.map(toWithDetails);
    },

    async findAllByTestRun(_testRunId: string): Promise<IssueWithDetails[]> {
      return [];
    },

    async findAllByTestResult(testResultId: string): Promise<IssueWithDetails[]> {
      const issues: IssueWithDetails[] = [];
      for (const [issueId, resultIds] of issueTestResultStore) {
        if (resultIds.has(testResultId)) {
          const issue = issueStore.get(issueId);
          if (issue) issues.push(toWithDetails(issue));
        }
      }
      return issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async create(input: {
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
      const issue = makeIssue(input);
      issueStore.set(issue.id, issue);
      return issue;
    },

    async createMany(
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
      return inputs.map((i) => {
        const issue = makeIssue({ ...i, code: null });
        issueStore.set(issue.id, issue);
        return issue;
      });
    },

    async update(
      id: string,
      changes: Partial<
        Pick<Issue, 'code' | 'title' | 'description' | 'actualResult' | 'expectedResult' | 'priority' | 'type' | 'moduleId' | 'targetRoleId' | 'externalLinks'>
      >,
    ): Promise<Issue> {
      const existing = issueStore.get(id);
      if (!existing) throw new Error(`mock issue not found: ${id}`);
      const updated: Issue = { ...existing, ...changes, updatedAt: new Date().toISOString() };
      issueStore.set(id, updated);
      return updated;
    },

    async updateStatus(id: string, status: IssueStatus): Promise<Issue> {
      const existing = issueStore.get(id);
      if (!existing) throw new Error(`mock issue not found: ${id}`);
      const updated: Issue = { ...existing, status, updatedAt: new Date().toISOString() };
      issueStore.set(id, updated);
      return updated;
    },

    async assign(id: string, assignedTo: string | null): Promise<Issue> {
      const existing = issueStore.get(id);
      if (!existing) throw new Error(`mock issue not found: ${id}`);
      const updated: Issue = { ...existing, assignedTo, updatedAt: new Date().toISOString() };
      issueStore.set(id, updated);
      return updated;
    },

    async remove(id: string): Promise<void> {
      issueStore.delete(id);
      issueTagStore.delete(id);
      issueTestResultStore.delete(id);
    },

    async linkToTestResult(issueId: string, testResultId: string): Promise<void> {
      if (!issueTestResultStore.has(issueId)) {
        issueTestResultStore.set(issueId, new Set());
      }
      issueTestResultStore.get(issueId)!.add(testResultId);
    },

    async unlinkFromTestResult(issueId: string, testResultId: string): Promise<void> {
      issueTestResultStore.get(issueId)?.delete(testResultId);
    },

    async replaceTags(issueId: string, tagIds: string[]): Promise<void> {
      if (tagIds.length === 0) {
        issueTagStore.delete(issueId);
        return;
      }
      issueTagStore.set(issueId, new Set(tagIds));
    },

    async findAttachments(issueId: string): Promise<Attachment[]> {
      return [...attachmentStore.values()]
        .filter((a) => a.entityType === 'issue' && a.entityId === issueId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async addAttachment(input: {
      issueId: string;
      projectId: string;
      storageProvider: string;
      url: string;
      fileName: string;
      fileSize: number | null;
      contentType: string | null;
    }): Promise<Attachment> {
      const att: Attachment = {
        id: nextAttachmentId(),
        entityType: 'issue',
        entityId: input.issueId,
        projectId: input.projectId,
        storageProvider: input.storageProvider,
        url: input.url,
        fileName: input.fileName,
        fileSize: input.fileSize,
        contentType: input.contentType,
        createdAt: new Date().toISOString(),
      };
      attachmentStore.set(att.id, att);
      return att;
    },

    async removeAttachment(id: string): Promise<void> {
      attachmentStore.delete(id);
    },
  };
}
