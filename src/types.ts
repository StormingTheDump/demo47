export const CATEGORIES = ['工作类', '生活类', '活动类', 'CEO 信箱'] as const;
export const TAB_CATEGORIES = ['全部', ...CATEGORIES] as const;
export const COMMENT_REACTIONS = ['👍', '❤️', '🎉', '💡', '👏'] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategoryFilter = (typeof TAB_CATEGORIES)[number];
export type SortMode = 'latest' | 'hot' | 'comments';
export type CommentReaction = (typeof COMMENT_REACTIONS)[number];
export type CommentReactionCounts = Record<CommentReaction, number>;

export interface CommentReply {
  id: string;
  author: string;
  createdAt: string;
  content: string;
}

export interface Comment {
  id: string;
  author: string;
  createdAt: string;
  content: string;
  isOwn?: boolean;
  reactions?: Partial<CommentReactionCounts>;
  replies?: CommentReply[];
}

export interface Message {
  id: string;
  category: Category;
  author: string;
  createdAt: string;
  title: string;
  body: string;
  likes: number;
  comments: Comment[];
}

export interface MessageInput {
  category: Category;
  title: string;
  body: string;
  authorName?: string;
}
