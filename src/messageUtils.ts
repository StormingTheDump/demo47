import { COMMENT_REACTIONS } from './types';
import type {
  Category,
  CategoryFilter,
  Comment,
  CommentReaction,
  CommentReactionCounts,
  CommentReply,
  Message,
  MessageInput,
  SortMode,
} from './types';

type MessageShape = Omit<Message, 'comments'> & {
  readonly comments: readonly Comment[];
};

const categoryIdPrefix: Record<Category, string> = {
  工作类: 'work',
  生活类: 'life',
  活动类: 'event',
  'CEO 信箱': 'ceo',
};

export const FLOWER_ALIASES = [
  '海棠',
  '木棉',
  '橙花',
  '山茶',
  '栀子',
  '风铃草',
  '向日葵',
  '玉兰',
  '白兰',
  '茉莉',
  '桂花',
  '鸢尾',
  '芍药',
  '紫藤',
  '雪柳',
  '银杏',
  '蔷薇',
  '扶桑',
  '铃兰',
  '薄荷',
] as const;

export const COMMENT_FLOWER_ALIASES = [
  '山茶',
  '白兰',
  '铃兰',
  '芍药',
  '茉莉',
  '桂花',
  '玫瑰',
  '荷风',
  '扶桑',
  '迎春',
  '紫藤',
  '丁香',
  '睡莲',
  '橘梗',
  '月桂',
  '青葵',
] as const;

export interface AuthorAvatar {
  label: string;
  tone: string;
}

const avatarTones = ['avatar-tone-1', 'avatar-tone-2', 'avatar-tone-3', 'avatar-tone-4', 'avatar-tone-5'] as const;

export function filterAndSortMessages<T extends MessageShape>(
  messages: readonly T[],
  category: CategoryFilter,
  searchTerm: string,
  sortMode: SortMode,
): T[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return [...messages]
    .filter((message) => category === '全部' || message.category === category)
    .filter((message) => {
      if (!normalizedSearch) {
        return true;
      }

      return `${message.title} ${message.body}`.toLowerCase().includes(normalizedSearch);
    })
    .sort((left, right) => {
      if (sortMode === 'hot') {
        return right.likes - left.likes || getCreatedTime(right) - getCreatedTime(left);
      }

      if (sortMode === 'comments') {
        return countMessageComments(right) - countMessageComments(left) || getCreatedTime(right) - getCreatedTime(left);
      }

      return getCreatedTime(right) - getCreatedTime(left);
    });
}

export function toggleMessageLike(message: MessageShape, hasLiked: boolean): Message {
  return {
    ...message,
    comments: message.comments.map(normalizeComment),
    likes: Math.max(0, message.likes + (hasLiked ? -1 : 1)),
  };
}

export function toggleCommentReaction(
  comment: Comment,
  reaction: CommentReaction,
  previousReaction?: CommentReaction,
): Comment {
  const reactions = normalizeCommentReactions(comment.reactions);

  if (previousReaction === reaction) {
    reactions[reaction] = Math.max(0, reactions[reaction] - 1);
  } else {
    if (previousReaction) {
      reactions[previousReaction] = Math.max(0, reactions[previousReaction] - 1);
    }

    reactions[reaction] += 1;
  }

  return {
    ...comment,
    reactions,
    replies: [...(comment.replies ?? [])],
  };
}

export function updateCommentReactionInMessage(
  message: MessageShape,
  commentId: string,
  reaction: CommentReaction,
  previousReaction?: CommentReaction,
): Message {
  return {
    ...message,
    comments: message.comments.map((comment) =>
      comment.id === commentId ? toggleCommentReaction(comment, reaction, previousReaction) : normalizeComment(comment),
    ),
  };
}

export function createMessage(input: MessageInput, existingMessageCount: number, createdAt: string): Message {
  const nextNumber = existingMessageCount + 1;
  const prefix = categoryIdPrefix[input.category];
  const trimmedTitle = input.title.trim();
  const trimmedBody = input.body.trim();
  const fallbackTitle = trimmedBody.slice(0, 36) || '新的反馈';

  return {
    id: `message-${prefix}-${Date.parse(createdAt)}-${nextNumber}`,
    category: input.category,
    author: input.authorName?.trim() || pickFlowerAlias(FLOWER_ALIASES, existingMessageCount),
    createdAt,
    title: trimmedTitle || fallbackTitle,
    body: trimmedBody || trimmedTitle,
    isOwn: Boolean(input.isOwn),
    likes: 0,
    comments: [],
  };
}

export function createComment(content: string, existingCommentCount: number, createdAt: string, isOwn = false): Comment {
  const nextNumber = existingCommentCount + 1;

  return {
    id: `comment-${Date.parse(createdAt)}-${nextNumber}`,
    author: pickFlowerAlias(COMMENT_FLOWER_ALIASES, existingCommentCount),
    createdAt,
    content: content.trim(),
    isOwn,
    reactions: createEmptyCommentReactions(),
    replies: [],
  };
}

export function createCommentReply(content: string, existingReplyCount: number, createdAt: string): CommentReply {
  const nextNumber = existingReplyCount + 1;

  return {
    id: `reply-${Date.parse(createdAt)}-${nextNumber}`,
    author: pickFlowerAlias(COMMENT_FLOWER_ALIASES, existingReplyCount + 3),
    createdAt,
    content: content.trim(),
  };
}

export function addCommentToMessage(message: MessageShape, comment: Comment): Message {
  return {
    ...message,
    comments: [...message.comments.map(normalizeComment), normalizeComment(comment)],
  };
}

export function addReplyToComment(message: MessageShape, commentId: string, reply: CommentReply): Message {
  return {
    ...message,
    comments: message.comments.map((comment) => {
      const normalizedComment = normalizeComment(comment);

      if (normalizedComment.id !== commentId) {
        return normalizedComment;
      }

      return {
        ...normalizedComment,
        replies: [...(normalizedComment.replies ?? []), reply],
      };
    }),
  };
}

export function removeOwnCommentFromMessage(message: MessageShape, commentId: string): Message {
  return {
    ...message,
    comments: message.comments
      .map(normalizeComment)
      .filter((comment) => comment.id !== commentId || !comment.isOwn),
  };
}

export function removeOwnMessageFromList(messages: readonly Message[], messageId: string): Message[] {
  return messages.map(normalizeMessage).filter((message) => message.id !== messageId || !message.isOwn);
}

export function normalizeMessageAliases(messages: readonly Message[]): Message[] {
  let commentIndex = 0;
  let replyIndex = 0;

  return messages.map((message, messageIndex) => {
    const author = isLegacyAnonymousAlias(message.author) ? pickFlowerAlias(FLOWER_ALIASES, messageIndex) : message.author;

    return {
      ...message,
      author,
      isOwn: Boolean(message.isOwn) || author === '匿名用户',
      comments: message.comments.map((comment) => {
        const currentCommentIndex = commentIndex;
        commentIndex += 1;

        return {
          ...normalizeComment(comment),
          author: isLegacyAnonymousAlias(comment.author)
            ? pickFlowerAlias(COMMENT_FLOWER_ALIASES, currentCommentIndex)
            : comment.author,
          replies: (comment.replies ?? []).map((reply) => {
            const currentReplyIndex = replyIndex;
            replyIndex += 1;

            return {
              ...reply,
              author: isLegacyAnonymousAlias(reply.author)
                ? pickFlowerAlias(COMMENT_FLOWER_ALIASES, currentReplyIndex + 3)
                : reply.author,
            };
          }),
        };
      }),
    };
  });
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatSmartTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    if (diffMs < minuteMs) {
      return '刚刚';
    }

    return `${Math.max(1, Math.floor(diffMs / minuteMs))} min ago`;
  }

  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)} hr ago`;
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);

  if (date.getFullYear() === now.getFullYear()) {
    return dateLabel;
  }

  return `${dateLabel}, ${date.getFullYear()}`;
}

export function getAuthorAvatar(author: string): AuthorAvatar {
  const hash = Array.from(author).reduce((total, character) => total + character.codePointAt(0)!, 0);

  return {
    label: Array.from(author)[0] ?? '花',
    tone: avatarTones[hash % avatarTones.length],
  };
}

export function countAllComments(messages: readonly Message[]): number {
  return messages.reduce((total, message) => total + message.comments.length, 0);
}

export function countAllReplies(messages: readonly Message[]): number {
  return messages.reduce(
    (total, message) => total + message.comments.reduce((replyTotal, comment) => replyTotal + (comment.replies?.length ?? 0), 0),
    0,
  );
}

export function countMessageComments(message: MessageShape): number {
  return message.comments.reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0);
}

export function createEmptyCommentReactions(): CommentReactionCounts {
  return COMMENT_REACTIONS.reduce(
    (counts, reaction) => ({
      ...counts,
      [reaction]: 0,
    }),
    {} as CommentReactionCounts,
  );
}

function normalizeComment(comment: Comment): Comment {
  return {
    ...comment,
    isOwn: Boolean(comment.isOwn),
    reactions: normalizeCommentReactions(comment.reactions),
    replies: [...(comment.replies ?? [])],
  };
}

function normalizeMessage(message: Message): Message {
  return {
    ...message,
    isOwn: Boolean(message.isOwn) || message.author === '匿名用户',
    comments: message.comments.map(normalizeComment),
  };
}

function normalizeCommentReactions(reactions?: Partial<CommentReactionCounts>): CommentReactionCounts {
  const next = createEmptyCommentReactions();

  COMMENT_REACTIONS.forEach((reaction) => {
    const value = reactions?.[reaction];
    next[reaction] = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
  });

  return next;
}

function pickFlowerAlias<T extends readonly string[]>(aliases: T, seedIndex: number): T[number] {
  return aliases[seedIndex % aliases.length];
}

function isLegacyAnonymousAlias(author: string): boolean {
  return /^匿名(同事|评论者)\s*\d+$/.test(author);
}

function getCreatedTime(message: MessageShape): number {
  return new Date(message.createdAt).getTime();
}
