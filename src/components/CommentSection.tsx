import { useState } from 'react';
import { COMMENT_REACTIONS } from '../types';
import { formatDateTime } from '../messageUtils';
import type { Comment, CommentReaction } from '../types';
import type { CommentReactionSelections } from '../storage';

interface CommentSectionProps {
  comments: readonly Comment[];
  selectedReactions: CommentReactionSelections;
  showComposer: boolean;
  onAddComment: (content: string) => void;
  onAddReply: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleReaction: (commentId: string, reaction: CommentReaction) => void;
}

export function CommentSection({
  comments,
  selectedReactions,
  showComposer,
  onAddComment,
  onAddReply,
  onDeleteComment,
  onToggleReaction,
}: CommentSectionProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!content.trim()) {
      setError('请输入评论内容');
      return;
    }

    onAddComment(content);
    setContent('');
    setError('');
  };

  const handleReplySubmit = (event: React.FormEvent<HTMLFormElement>, commentId: string) => {
    event.preventDefault();

    const replyContent = replyDrafts[commentId] ?? '';
    if (!replyContent.trim()) {
      setReplyErrors((current) => ({ ...current, [commentId]: '请输入回复内容' }));
      return;
    }

    onAddReply(commentId, replyContent);
    setReplyDrafts((current) => ({ ...current, [commentId]: '' }));
    setReplyErrors((current) => ({ ...current, [commentId]: '' }));
    setActiveReplyId(null);
  };

  const handleDeleteComment = (commentId: string) => {
    onDeleteComment(commentId);
    setActiveCommentMenuId(null);
    setActiveReplyId((current) => (current === commentId ? null : current));
    setReplyDrafts((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    setReplyErrors((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
  };

  return (
    <section className="comment-section">
      {comments.length > 0 ? (
        <div className="comments-list">
          {comments.map((comment) => {
            const replies = comment.replies ?? [];
            const reactionRows = COMMENT_REACTIONS.map((reaction) => ({
              reaction,
              count: comment.reactions?.[reaction] ?? 0,
            })).filter((item) => item.count > 0);

            return (
              <div className="comment-item" key={comment.id}>
                <div className="comment-meta">
                  <span>{comment.author}</span>
                  <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
                </div>
                <p>{comment.content}</p>

                <div className="comment-actions">
                  <div className="reaction-picker">
                    <button
                      className={`reply-button reaction-trigger${selectedReactions[comment.id] ? ' active' : ''}`}
                      type="button"
                      aria-pressed={Boolean(selectedReactions[comment.id])}
                      onClick={() => onToggleReaction(comment.id, '👍')}
                    >
                      <span aria-hidden="true">👍</span>
                      <span>表态</span>
                    </button>
                    <div className="reaction-menu" role="group" aria-label="选择表情点赞">
                      {COMMENT_REACTIONS.map((reaction) => {
                        const isActive = selectedReactions[comment.id] === reaction;

                        return (
                          <button
                            className={`reaction-choice${isActive ? ' active' : ''}`}
                            type="button"
                            key={reaction}
                            onClick={() => onToggleReaction(comment.id, reaction)}
                            aria-pressed={isActive}
                            title={`用 ${reaction} 表态`}
                          >
                            {reaction}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    className="reply-button"
                    type="button"
                    onClick={() => setActiveReplyId((current) => (current === comment.id ? null : comment.id))}
                  >
                    回复 {replies.length}
                  </button>
                </div>

                {reactionRows.length > 0 ? (
                  <div className="reaction-breakdown" aria-label="评论表情统计">
                    {reactionRows.map((item) => (
                      <div className="reaction-line" key={item.reaction}>
                        <span>{item.reaction}</span>
                        <span>{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {replies.length > 0 ? (
                  <div className="reply-list">
                    {replies.map((reply) => (
                      <div className="reply-item" key={reply.id}>
                        <div className="comment-meta">
                          <span>{reply.author}</span>
                          <time dateTime={reply.createdAt}>{formatDateTime(reply.createdAt)}</time>
                        </div>
                        <p>{reply.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {activeReplyId === comment.id ? (
                  <form className="reply-form" onSubmit={(event) => handleReplySubmit(event, comment.id)}>
                    <textarea
                      aria-label={`回复 ${comment.author}`}
                      value={replyDrafts[comment.id] ?? ''}
                      onChange={(event) => {
                        setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }));
                        if (replyErrors[comment.id]) {
                          setReplyErrors((current) => ({ ...current, [comment.id]: '' }));
                        }
                      }}
                      placeholder={`回复 ${comment.author}`}
                      rows={2}
                    />
                    <div className="reply-form-footer">
                      <span className="field-error">{replyErrors[comment.id]}</span>
                      <button type="submit">提交回复</button>
                    </div>
                  </form>
                ) : null}

                {comment.isOwn ? (
                  <div className="comment-item-footer">
                    <div className="comment-more-wrap">
                      <button
                        className="icon-button comment-more-button"
                        type="button"
                        aria-label="评论更多操作"
                        aria-expanded={activeCommentMenuId === comment.id}
                        onClick={() => setActiveCommentMenuId((current) => (current === comment.id ? null : comment.id))}
                      >
                        ···
                      </button>
                      {activeCommentMenuId === comment.id ? (
                        <div className="comment-more-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => handleDeleteComment(comment.id)}>
                            删除
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-comments">暂无评论</p>
      )}

      {showComposer ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            aria-label="评论内容"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (error) {
                setError('');
              }
            }}
            placeholder="匿名评论"
            rows={3}
          />
          <div className="comment-form-footer">
            <span className="field-error">{error}</span>
            <button type="submit">提交评论</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
