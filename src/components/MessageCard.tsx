import { useState } from 'react';
import { CommentSection } from './CommentSection';
import { countMessageComments, formatSmartTime, getAuthorAvatar } from '../messageUtils';
import type { Category, CommentReaction, Message } from '../types';
import type { CommentReactionSelections } from '../storage';

interface MessageCardProps {
  message: Message;
  isLiked: boolean;
  isComposerOpen: boolean;
  isCommentSectionVisible: boolean;
  commentReactionSelections: CommentReactionSelections;
  onToggleLike: (messageId: string) => void;
  onToggleComments: (message: Message) => void;
  onSelectCategory: (category: Category) => void;
  onShare: (message: Message) => void;
  onToast: (message: string) => void;
  onAddComment: (messageId: string, content: string) => void;
  onAddCommentReply: (messageId: string, commentId: string, content: string) => void;
  onDeleteComment: (messageId: string, commentId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleCommentReaction: (messageId: string, commentId: string, reaction: CommentReaction) => void;
}

export function MessageCard({
  message,
  isLiked,
  isComposerOpen,
  isCommentSectionVisible,
  commentReactionSelections,
  onToggleLike,
  onToggleComments,
  onSelectCategory,
  onShare,
  onToast,
  onAddComment,
  onAddCommentReply,
  onDeleteComment,
  onDeleteMessage,
  onToggleCommentReaction,
}: MessageCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isCeoMailbox = message.category === 'CEO 信箱';
  const avatar = getAuthorAvatar(message.author);
  const shouldShowComments = isCommentSectionVisible || isComposerOpen;

  const handleMenuAction = (label: string) => {
    setIsMenuOpen(false);
    if (label === '复制链接') {
      onShare(message);
      return;
    }

    if (label === '删除') {
      onDeleteMessage(message.id);
      return;
    }

    onToast(label === '收藏' ? '已收藏' : '已提交举报');
  };

  const menuItems = message.isOwn ? ['收藏', '举报', '复制链接', '删除'] : ['收藏', '举报', '复制链接'];

  return (
    <article className={`message-card${isCeoMailbox ? ' ceo-card' : ''}`}>
      <header className="card-header">
        <div className="author-row">
          <div className={`author-avatar ${avatar.tone}`} aria-hidden="true">
            {avatar.label}
          </div>
          <div className="author-info">
            <span className="author-name">{message.author}</span>
            <div className="category-line">
              <button className="category-pill" type="button" onClick={() => onSelectCategory(message.category)}>
                <span className="category-thumb" aria-hidden="true">
                  {message.category.slice(0, 1)}
                </span>
                <span>{message.category}</span>
                <span aria-hidden="true">›</span>
              </button>
              {isCeoMailbox ? <span className="ceo-badge">CEO Mailbox</span> : null}
            </div>
          </div>
        </div>
        <time className="message-time" dateTime={message.createdAt}>
          {formatSmartTime(message.createdAt)}
        </time>
      </header>

      <div className="message-summary">
        <h2 className="message-title">{message.title}</h2>
        <p className="message-body">{message.body}</p>
      </div>

      <footer className="card-actions">
        <button
          className={`icon-text-button like-button${isLiked ? ' active' : ''}`}
          type="button"
          onClick={() => onToggleLike(message.id)}
          aria-pressed={isLiked}
        >
          <span aria-hidden="true">👍</span>
          <span>{message.likes}</span>
        </button>
        <button className="icon-text-button" type="button" onClick={() => onToggleComments(message)}>
          <span aria-hidden="true">💬</span>
          <span>{countMessageComments(message)}</span>
        </button>
        <button className="icon-text-button share-button" type="button" onClick={() => onShare(message)}>
          <span aria-hidden="true">↗</span>
          <span>转发</span>
        </button>
        <div className="more-wrap">
          <button
            className="icon-button more-button"
            type="button"
            aria-label="更多操作"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            ···
          </button>
          {isMenuOpen ? (
            <div className="more-menu" role="menu">
              {menuItems.map((label) => (
                <button
                  className={label === '删除' ? 'danger-menu-item' : undefined}
                  type="button"
                  role="menuitem"
                  key={label}
                  onClick={() => handleMenuAction(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </footer>

      {shouldShowComments ? (
        <CommentSection
          comments={message.comments}
          selectedReactions={commentReactionSelections}
          showComposer={isComposerOpen}
          onAddComment={(content) => onAddComment(message.id, content)}
          onAddReply={(commentId, content) => onAddCommentReply(message.id, commentId, content)}
          onDeleteComment={(commentId) => onDeleteComment(message.id, commentId)}
          onToggleReaction={(commentId, reaction) => onToggleCommentReaction(message.id, commentId, reaction)}
        />
      ) : null}
    </article>
  );
}
