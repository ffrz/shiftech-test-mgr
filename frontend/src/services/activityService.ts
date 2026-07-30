import { activityRepository } from '../repositories/activityRepository';
import { profileRepository } from '../repositories/profileRepository';
import { notificationService } from './notificationService';
import type { ActivityEntityType } from '../types/domain';

// @username mention syntax: word-boundary @ followed by username characters. Doesn't
// validate the username exists here — resolution below silently skips handles that don't
// resolve to a profile, same "best effort" spirit as the rest of the notification system.
const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;

function extractMentionedUsernames(body: string): string[] {
  const handles = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    handles.add(match[1]);
  }
  return [...handles];
}

export const activityService = {
  listForEntity(entityType: ActivityEntityType, entityId: string) {
    return activityRepository.findForEntity(entityType, entityId);
  },

  async addComment(input: {
    projectId: string;
    entityType: ActivityEntityType;
    entityId: string;
    actorId: string;
    actorName: string;
    body: string;
    parentCommentId?: string | null;
  }) {
    const trimmed = input.body.trim();
    if (!trimmed) throw new Error('Comment cannot be empty.');

    const entry = await activityRepository.create({
      projectId: input.projectId,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      eventType: 'comment',
      payload: { body: trimmed },
      parentCommentId: input.parentCommentId ?? null,
    });

    const usernames = extractMentionedUsernames(trimmed);
    if (usernames.length > 0) {
      const profiles = await Promise.all(usernames.map((username) => profileRepository.findByUsername(username)));
      const recipients = profiles.filter((p): p is NonNullable<typeof p> => p !== null && p.id !== input.actorId);
      await Promise.all(
        recipients.map((recipient) =>
          notificationService.create(
            recipient.id,
            'mention',
            `${input.actorName} mentioned you in a comment`,
            trimmed,
            input.entityType,
            input.entityId,
          ),
        ),
      );
    }

    return entry;
  },

  editComment(id: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) throw new Error('Comment cannot be empty.');
    return activityRepository.updateComment(id, trimmed);
  },

  softDeleteComment(id: string) {
    return activityRepository.softDelete(id);
  },

  logEvent(input: {
    projectId: string;
    entityType: ActivityEntityType;
    entityId: string;
    actorId: string;
    eventType: string;
    payload?: Record<string, unknown>;
  }) {
    return activityRepository.create(input);
  },
};
