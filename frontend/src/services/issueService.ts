import { issueRepository } from '../repositories/issueRepository';
import { tagService } from './tagService';
import { activityService } from './activityService';
import { notificationService } from './notificationService';
import { ISSUE_STATUS_LABEL } from '../helpers/statusLabels';
import type { ExternalLink, Issue, IssuePriority, IssueStatus, IssueType } from '../types/domain';

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
      testRoleIds?: string[];
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
    code?: string | null;
    title: string;
    description?: string;
    actualResult?: string;
    expectedResult?: string;
    priority?: IssuePriority;
    status?: IssueStatus;
    targetRoleId?: string | null;
    externalLinks?: ExternalLink[];
    tagNames?: string[];
    assignedTo?: string | null;
    // If given, the created issue is immediately linked to this test result — used by the
    // "create new inline" flow in the Test Run Link Issue dialog.
    linkToTestResultId?: string;
    createdBy?: string | null;
  }): Promise<Issue> {
    if (!input.title.trim()) throw new Error('Issue title cannot be empty');

    const issue = await issueRepository.create({
      projectId: input.projectId,
      moduleId: input.moduleId ?? null,
      type: input.type ?? 'bug',
      code: input.code?.trim() || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'open',
      assignedTo: input.assignedTo ?? null,
      targetRoleId: input.targetRoleId ?? null,
      externalLinks: input.externalLinks ?? [],
      createdBy: input.createdBy ?? null,
    });

    if (input.tagNames?.length) {
      await tagService.saveTagsForIssue(input.projectId, issue.id, input.tagNames);
    }

    if (input.linkToTestResultId) {
      await issueRepository.linkToTestResult(issue.id, input.linkToTestResultId);
    }

    // A "created" activity row so a new issue shows up on the issue's own timeline and in
    // the project Activity Log feed right away — same producer pattern as status_change /
    // assignment (see ROADMAP_V2 Phase 8). Only when createdBy (the current user) is known:
    // the entity_activity insert policy requires actor_id = auth.uid().
    if (input.createdBy) {
      await activityService.logEvent({
        projectId: input.projectId,
        entityType: 'issue',
        entityId: issue.id,
        actorId: input.createdBy,
        eventType: 'created',
        payload: { code: issue.code, title: issue.title },
      });
    }

    return issue;
  },

  async createMany(inputs: {
    projectId: string;
    moduleId?: string | null;
    type?: IssueType;
    title: string;
    description?: string;
    actualResult?: string;
    expectedResult?: string;
    priority?: IssuePriority;
    status?: IssueStatus;
    externalLinks?: ExternalLink[];
    tagNames?: string[];
  }[]): Promise<Issue[]> {
    for (const input of inputs) {
      if (!input.title.trim()) throw new Error('Issue title cannot be empty');
    }

    const issues = await issueRepository.createMany(
      inputs.map((input) => ({
        projectId: input.projectId,
        moduleId: input.moduleId ?? null,
        type: input.type ?? 'bug',
        title: input.title.trim(),
        description: input.description?.trim() || null,
        actualResult: input.actualResult?.trim() || null,
        expectedResult: input.expectedResult?.trim() || null,
        priority: input.priority ?? 'medium',
        status: input.status ?? 'open' as IssueStatus,
        assignedTo: null,
        externalLinks: input.externalLinks ?? [],
      })),
    );

    const withTags = issues
      .map((issue, i) => ({ issue, tagNames: inputs[i]?.tagNames ?? [] }))
      .filter((x) => x.tagNames.length > 0);
    if (withTags.length > 0) {
      await tagService.saveTagsForIssueMany(
        inputs[0].projectId,
        withTags.map((x) => ({ issueId: x.issue.id, tagNames: x.tagNames })),
      );
    }

    return issues;
  },

  async update(
    id: string,
    projectId: string,
    input: {
      code?: string;
      title: string;
      description?: string;
      actualResult?: string;
      expectedResult?: string;
      priority: IssuePriority;
      type: IssueType;
      moduleId: string | null;
      targetRoleId?: string | null;
      externalLinks: ExternalLink[];
    },
    tagNames?: string[],
    actorId?: string | null,
  ) {
    if (!input.title.trim()) throw new Error('Issue title cannot be empty');
    const issue = await issueRepository.update(id, {
      ...(input.code?.trim() ? { code: input.code.trim() } : {}),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority,
      type: input.type,
      moduleId: input.moduleId,
      ...(input.targetRoleId !== undefined ? { targetRoleId: input.targetRoleId } : {}),
      externalLinks: input.externalLinks,
    });
    if (tagNames !== undefined) {
      await tagService.saveTagsForIssue(projectId, id, tagNames);
    }
    if (actorId) {
      await activityService.logEvent({
        projectId,
        entityType: 'issue',
        entityId: id,
        actorId,
        eventType: 'updated',
        payload: { code: issue.code, title: issue.title },
      });
    }
    return issue;
  },

  async patchField(
    id: string,
    changes: Partial<Pick<Issue, 'title' | 'priority' | 'type' | 'moduleId' | 'targetRoleId'>>,
    context?: { projectId: string; actorId?: string },
  ) {
    if (changes.title !== undefined && !changes.title.trim()) {
      throw new Error('Issue title cannot be empty');
    }
    const issue = await issueRepository.update(id, changes.title !== undefined ? { ...changes, title: changes.title.trim() } : changes);
    if (context?.actorId) {
      await activityService.logEvent({
        projectId: context.projectId,
        entityType: 'issue',
        entityId: id,
        actorId: context.actorId,
        eventType: 'updated',
        payload: { code: issue.code, title: issue.title },
      });
    }
    return issue;
  },

  async changeStatus(id: string, status: IssueStatus, actor: { projectId: string; actorId: string; actorName?: string | null }) {
    const previous = await issueRepository.findById(id);
    const issue = await issueRepository.updateStatus(id, status);
    if (previous && previous.status !== status) {
      await activityService.logEvent({
        projectId: actor.projectId,
        entityType: 'issue',
        entityId: id,
        actorId: actor.actorId,
        eventType: 'status_change',
        payload: { from: previous.status, to: status },
      });
      // Only the assignee has a direct stake in an issue's status — no broadcast to the
      // whole project (see ROADMAP_V2 Phase 8 T06 decision: notifications stay targeted,
      // not a Team Chat-style activity firehose).
      if (previous.assignedTo && previous.assignedTo !== actor.actorId) {
        await notificationService.create(
          previous.assignedTo,
          'status_change',
          `${actor.actorName ?? 'Someone'} changed "${previous.title}" to ${ISSUE_STATUS_LABEL[status]}`,
          null,
          'issue',
          id,
        );
      }
    }
    return issue;
  },

  async assign(id: string, assignedTo: string | null, actor: { projectId: string; actorId: string; actorName?: string | null; assigneeName?: string | null }) {
    const issue = await issueRepository.assign(id, assignedTo);
    await activityService.logEvent({
      projectId: actor.projectId,
      entityType: 'issue',
      entityId: id,
      actorId: actor.actorId,
      eventType: 'assignment',
      payload: { assigneeName: assignedTo ? (actor.assigneeName ?? null) : null },
    });
    if (assignedTo && assignedTo !== actor.actorId) {
      await notificationService.create(
        assignedTo,
        'assignment',
        `${actor.actorName ?? 'Someone'} assigned you to "${issue.title}"`,
        null,
        'issue',
        id,
      );
    }
    return issue;
  },

  // Sequential (not Promise.all) — each call writes its own activity_log row + possible
  // notification, and per-project write order matters less than not hammering Supabase
  // with a burst of concurrent writes for a large selection.
  async bulkChangeStatus(ids: string[], status: IssueStatus, actor: { projectId: string; actorId: string; actorName?: string | null }) {
    for (const id of ids) {
      await issueService.changeStatus(id, status, actor);
    }
  },

  async bulkAssign(ids: string[], assignedTo: string | null, actor: { projectId: string; actorId: string; actorName?: string | null; assigneeName?: string | null }) {
    for (const id of ids) {
      await issueService.assign(id, assignedTo, actor);
    }
  },

  async remove(id: string, context?: { actorId?: string }) {
    if (context?.actorId) {
      const issue = await issueRepository.findById(id);
      await issueRepository.remove(id);
      if (issue) {
        await activityService.logEvent({
          projectId: issue.projectId,
          entityType: 'issue',
          entityId: id,
          actorId: context.actorId,
          eventType: 'deleted',
          payload: { code: issue.code, title: issue.title },
        });
      }
      return;
    }
    return issueRepository.remove(id);
  },

  linkToTestResult: issueRepository.linkToTestResult,
  unlinkFromTestResult: issueRepository.unlinkFromTestResult,

  listAttachments: issueRepository.findAttachments,
  removeAttachment: issueRepository.removeAttachment,
};
