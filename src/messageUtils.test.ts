import { describe, expect, it } from 'vitest';
import {
  addCommentToMessage,
  addReplyToComment,
  COMMENT_FLOWER_ALIASES,
  countMessageComments,
  createComment,
  createCommentReply,
  createMessage,
  filterAndSortMessages,
  FLOWER_ALIASES,
  formatSmartTime,
  getAuthorAvatar,
  normalizeMessageAliases,
  removeOwnCommentFromMessage,
  toggleCommentReaction,
  toggleMessageLike,
} from './messageUtils';
import type { CommentReaction, Message } from './types';

const baseMessages: Message[] = [
  {
    id: 'work-1',
    category: '工作类',
    author: '海棠',
    createdAt: '2026-07-01T09:00:00.000Z',
    title: '会议效率建议',
    body: '希望周会减少同步型内容，把决策事项提前放到议程里。',
    likes: 8,
    comments: [
      {
        id: 'comment-1',
        author: '山茶',
        createdAt: '2026-07-01T10:00:00.000Z',
        content: '赞成，提前看材料会更高效。',
      },
    ],
  },
  {
    id: 'life-1',
    category: '生活类',
    author: '木棉',
    createdAt: '2026-07-03T09:00:00.000Z',
    title: '咖啡机补豆',
    body: '下午经常没有咖啡豆，建议设置固定补给时间。',
    likes: 16,
    comments: [],
  },
  {
    id: 'ceo-1',
    category: 'CEO 信箱',
    author: '橙花',
    createdAt: '2026-07-02T09:00:00.000Z',
    title: '战略沟通频率',
    body: '希望季度 OKR 背后的取舍能有更透明的同步。',
    likes: 10,
    comments: [
      {
        id: 'comment-2',
        author: '白兰',
        createdAt: '2026-07-02T10:00:00.000Z',
        content: '这对理解优先级很有帮助。',
      },
      {
        id: 'comment-3',
        author: '铃兰',
        createdAt: '2026-07-02T11:00:00.000Z',
        content: '也希望同步风险。',
        replies: [
          {
            id: 'reply-1',
            author: '紫藤',
            createdAt: '2026-07-02T12:00:00.000Z',
            content: '风险同步也可以和季度复盘放一起。',
          },
        ],
      },
    ],
  },
];

describe('messageUtils', () => {
  it('filters by category and search text', () => {
    const result = filterAndSortMessages(baseMessages, 'CEO 信箱', '战略', 'latest');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ceo-1');
  });

  it('sorts messages by newest, hottest, and most commented', () => {
    expect(filterAndSortMessages(baseMessages, '全部', '', 'latest').map((item) => item.id)).toEqual([
      'life-1',
      'ceo-1',
      'work-1',
    ]);
    expect(filterAndSortMessages(baseMessages, '全部', '', 'hot').map((item) => item.id)).toEqual([
      'life-1',
      'ceo-1',
      'work-1',
    ]);
    expect(filterAndSortMessages(baseMessages, '全部', '', 'comments').map((item) => item.id)).toEqual([
      'ceo-1',
      'work-1',
      'life-1',
    ]);
  });

  it('toggles message likes without mutating the source message', () => {
    const liked = toggleMessageLike(baseMessages[0], false);
    const unliked = toggleMessageLike(liked, true);

    expect(liked.likes).toBe(9);
    expect(unliked.likes).toBe(8);
    expect(baseMessages[0].likes).toBe(8);
  });

  it('toggles comment reactions and switches between emojis', () => {
    const firstReaction: CommentReaction = '👍';
    const nextReaction: CommentReaction = '💡';
    const liked = toggleCommentReaction(baseMessages[0].comments[0], firstReaction);
    const switched = toggleCommentReaction(liked, nextReaction, firstReaction);
    const removed = toggleCommentReaction(switched, nextReaction, nextReaction);

    expect(liked.reactions?.[firstReaction]).toBe(1);
    expect(switched.reactions?.[firstReaction]).toBe(0);
    expect(switched.reactions?.[nextReaction]).toBe(1);
    expect(removed.reactions?.[nextReaction]).toBe(0);
    expect(baseMessages[0].comments[0].reactions).toBeUndefined();
  });

  it('creates messages, comments, and replies with flower aliases', () => {
    const message = createMessage(
      { category: '活动类', title: '羽毛球活动', body: '希望固定每周一次。' },
      12,
      '2026-07-05T08:00:00.000Z',
    );
    const comment = createComment('这个建议很好。', 7, '2026-07-05T09:00:00.000Z');
    const reply = createCommentReply('同意这个补充。', 4, '2026-07-05T10:00:00.000Z');

    expect(FLOWER_ALIASES).toContain(message.author);
    expect(COMMENT_FLOWER_ALIASES).toContain(comment.author);
    expect(COMMENT_FLOWER_ALIASES).toContain(reply.author);
    expect(message.author).not.toContain('匿名同事');
    expect(comment.author).not.toContain('匿名评论者');
    expect(comment.reactions?.['👍']).toBe(0);
    expect(comment.replies).toEqual([]);
  });

  it('creates a post with explicit display name and falls back title from body', () => {
    const message = createMessage(
      { category: '工作类', title: '', body: '这是一条只填写正文的反馈。', authorName: '匿名用户' },
      2,
      '2026-07-06T10:00:00.000Z',
    );

    expect(message.author).toBe('匿名用户');
    expect(message.title).toBe('这是一条只填写正文的反馈。');
    expect(message.body).toBe('这是一条只填写正文的反馈。');
  });

  it('migrates legacy anonymous aliases and hydrates old comment fields', () => {
    const normalized = normalizeMessageAliases([
      {
        ...baseMessages[0],
        author: '匿名同事 001',
        comments: [
          {
            id: 'legacy-comment',
            author: '匿名评论者 001',
            createdAt: '2026-07-01T10:00:00.000Z',
            content: '旧评论。',
          },
        ],
      },
    ]);

    expect(normalized[0].author).toBe('海棠');
    expect(normalized[0].comments[0].author).toBe('山茶');
    expect(normalized[0].comments[0].reactions?.['👍']).toBe(0);
    expect(normalized[0].comments[0].replies).toEqual([]);
  });

  it('adds comments and comment replies while preserving source objects', () => {
    const comment = createComment('希望尽快试点。', 0, '2026-07-05T09:00:00.000Z');
    const reply = createCommentReply('可以先在一个楼层试。', 0, '2026-07-05T10:00:00.000Z');
    const withComment = addCommentToMessage(baseMessages[1], comment);
    const withReply = addReplyToComment(withComment, comment.id, reply);

    expect(withComment.id).toBe('life-1');
    expect(withReply.comments[0].replies).toHaveLength(1);
    expect(countMessageComments(withReply)).toBe(2);
    expect(baseMessages[1].comments).toHaveLength(0);
  });

  it('only deletes comments created by the current user', () => {
    const ownComment = createComment('这是我刚刚发出的测试评论。', 0, '2026-07-05T09:00:00.000Z', true);
    const otherComment = createComment('这是其他人的评论。', 1, '2026-07-05T09:05:00.000Z');
    const withComments = {
      ...baseMessages[1],
      comments: [ownComment, otherComment],
    };

    const removedOwn = removeOwnCommentFromMessage(withComments, ownComment.id);
    const keptOther = removeOwnCommentFromMessage(withComments, otherComment.id);

    expect(removedOwn.comments.map((comment) => comment.id)).toEqual([otherComment.id]);
    expect(keptOther.comments.map((comment) => comment.id)).toEqual([ownComment.id, otherComment.id]);
    expect(ownComment.isOwn).toBe(true);
    expect(otherComment.isOwn).toBe(false);
  });

  it('formats recent message time as relative and older time as compact dates', () => {
    const now = new Date('2026-07-06T12:00:00.000Z');

    expect(formatSmartTime('2026-07-06T12:00:00.000Z', now)).toBe('刚刚');
    expect(formatSmartTime('2026-07-06T11:35:00.000Z', now)).toBe('25 min ago');
    expect(formatSmartTime('2026-07-06T07:00:00.000Z', now)).toBe('5 hr ago');
    expect(formatSmartTime('2026-07-01T07:00:00.000Z', now)).toBe('Jul 1');
    expect(formatSmartTime('2025-07-01T07:00:00.000Z', now)).toBe('Jul 1, 2025');
  });

  it('maps authors to stable custom avatars', () => {
    const avatar = getAuthorAvatar('海棠');

    expect(avatar.label).toHaveLength(1);
    expect(avatar.tone).toMatch(/^avatar-tone-/);
    expect(getAuthorAvatar('海棠')).toEqual(avatar);
  });
});
