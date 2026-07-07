import { COMMENT_REACTIONS } from './types';
import { mockMessages } from './data/mockMessages';
import { normalizeMessageAliases } from './messageUtils';
import type { CommentReaction, Message } from './types';

const MESSAGES_KEY = 'anonymous-board:messages';
const LIKED_MESSAGES_KEY = 'anonymous-board:liked-message-ids';
const COMMENT_REACTION_SELECTIONS_KEY = 'anonymous-board:comment-reaction-selections';

export type CommentReactionSelections = Record<string, CommentReaction>;

export function loadMessages(): Message[] {
  if (!canUseLocalStorage()) {
    return normalizeMessageAliases(cloneMessages(mockMessages));
  }

  const saved = window.localStorage.getItem(MESSAGES_KEY);
  if (!saved) {
    return normalizeMessageAliases(cloneMessages(mockMessages));
  }

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return normalizeMessageAliases(parsed as Message[]);
    }
  } catch {
    window.localStorage.removeItem(MESSAGES_KEY);
  }

  return normalizeMessageAliases(cloneMessages(mockMessages));
}

export function saveMessages(messages: readonly Message[]): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function loadLikedMessageIds(): string[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const saved = window.localStorage.getItem(LIKED_MESSAGES_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    window.localStorage.removeItem(LIKED_MESSAGES_KEY);
  }

  return [];
}

export function saveLikedMessageIds(messageIds: readonly string[]): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(LIKED_MESSAGES_KEY, JSON.stringify(messageIds));
}

export function loadCommentReactionSelections(): CommentReactionSelections {
  if (!canUseLocalStorage()) {
    return {};
  }

  const saved = window.localStorage.getItem(COMMENT_REACTION_SELECTIONS_KEY);
  if (!saved) {
    return {};
  }

  try {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, CommentReaction] =>
            typeof entry[0] === 'string' && COMMENT_REACTIONS.includes(entry[1] as CommentReaction),
        ),
      );
    }
  } catch {
    window.localStorage.removeItem(COMMENT_REACTION_SELECTIONS_KEY);
  }

  return {};
}

export function saveCommentReactionSelections(selections: CommentReactionSelections): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(COMMENT_REACTION_SELECTIONS_KEY, JSON.stringify(selections));
}

function cloneMessages(messages: readonly Message[]): Message[] {
  return messages.map((message) => ({
    ...message,
    comments: message.comments.map((comment) => ({
      ...comment,
      reactions: { ...comment.reactions },
      replies: comment.replies?.map((reply) => ({ ...reply })) ?? [],
    })),
  }));
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
