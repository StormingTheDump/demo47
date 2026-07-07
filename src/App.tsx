import { useEffect, useMemo, useState } from 'react';
import { InlineComposer } from './components/InlineComposer';
import { MessageCard } from './components/MessageCard';
import {
  addCommentToMessage,
  addReplyToComment,
  countAllComments,
  countAllReplies,
  createComment,
  createCommentReply,
  createMessage,
  filterAndSortMessages,
  removeOwnCommentFromMessage,
  toggleMessageLike,
  updateCommentReactionInMessage,
} from './messageUtils';
import {
  loadCommentReactionSelections,
  loadLikedMessageIds,
  loadMessages,
  saveCommentReactionSelections,
  saveLikedMessageIds,
  saveMessages,
} from './storage';
import { TAB_CATEGORIES } from './types';
import type { Category, CategoryFilter, CommentReaction, Message, MessageInput, SortMode } from './types';
import type { CommentReactionSelections } from './storage';

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'latest', label: '最新' },
  { value: 'hot', label: '最热' },
  { value: 'comments', label: '评论最多' },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [likedMessageIds, setLikedMessageIds] = useState<Set<string>>(() => new Set(loadLikedMessageIds()));
  const [commentReactionSelections, setCommentReactionSelections] = useState<CommentReactionSelections>(() =>
    loadCommentReactionSelections(),
  );
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('全部');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [composerMessageId, setComposerMessageId] = useState<string | null>(null);
  const [hiddenCommentIds, setHiddenCommentIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState('');

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    saveLikedMessageIds([...likedMessageIds]);
  }, [likedMessageIds]);

  useEffect(() => {
    saveCommentReactionSelections(commentReactionSelections);
  }, [commentReactionSelections]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1600);
  };

  const visibleMessages = useMemo(
    () => filterAndSortMessages(messages, activeCategory, searchTerm, sortMode),
    [activeCategory, messages, searchTerm, sortMode],
  );

  const handleCreateMessage = (input: MessageInput) => {
    const nextMessage = createMessage(input, messages.length, new Date().toISOString());

    setMessages((current) => [nextMessage, ...current]);
    setActiveCategory(input.category);
    setSearchTerm('');
    setSortMode('latest');
    setComposerMessageId(nextMessage.id);
    setHiddenCommentIds((current) => {
      const next = new Set(current);
      next.delete(nextMessage.id);
      return next;
    });
    showToast('已发布');
  };

  const handleToggleLike = (messageId: string) => {
    const hasLiked = likedMessageIds.has(messageId);

    setMessages((current) =>
      current.map((message) => (message.id === messageId ? toggleMessageLike(message, hasLiked) : message)),
    );
    setLikedMessageIds((current) => {
      const next = new Set(current);

      if (hasLiked) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }

      return next;
    });
  };

  const handleToggleCommentReaction = (messageId: string, commentId: string, reaction: CommentReaction) => {
    const previousReaction = commentReactionSelections[commentId];

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? updateCommentReactionInMessage(message, commentId, reaction, previousReaction) : message,
      ),
    );
    setCommentReactionSelections((current) => {
      const next = { ...current };

      if (previousReaction === reaction) {
        delete next[commentId];
      } else {
        next[commentId] = reaction;
      }

      return next;
    });
  };

  const handleToggleComments = (message: Message) => {
    if (message.comments.length === 0) {
      setComposerMessageId((current) => (current === message.id ? null : message.id));
      return;
    }

    const willShowComments = hiddenCommentIds.has(message.id);

    setHiddenCommentIds((current) => {
      const next = new Set(current);

      if (next.has(message.id)) {
        next.delete(message.id);
      } else {
        next.add(message.id);
      }

      return next;
    });
    setComposerMessageId((current) => (willShowComments ? message.id : current === message.id ? null : current));
  };

  const handleSelectCategory = (category: Category) => {
    setActiveCategory(category);
    setSearchTerm('');
  };

  const handleAddComment = (messageId: string, content: string) => {
    const nextComment = createComment(content, countAllComments(messages), new Date().toISOString(), true);

    setMessages((current) =>
      current.map((message) => (message.id === messageId ? addCommentToMessage(message, nextComment) : message)),
    );
    setComposerMessageId(messageId);
    setHiddenCommentIds((current) => {
      const next = new Set(current);
      next.delete(messageId);
      return next;
    });
  };

  const handleDeleteOwnComment = (messageId: string, commentId: string) => {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? removeOwnCommentFromMessage(message, commentId) : message)),
    );
    setCommentReactionSelections((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    showToast('已删除评论');
  };

  const handleAddCommentReply = (messageId: string, commentId: string, content: string) => {
    const nextReply = createCommentReply(content, countAllReplies(messages), new Date().toISOString());

    setMessages((current) =>
      current.map((message) => (message.id === messageId ? addReplyToComment(message, commentId, nextReply) : message)),
    );
    setComposerMessageId(messageId);
  };

  const handleShareMessage = (message: Message) => {
    const shareText = `${message.title}\n${message.body}`;

    try {
      void navigator.clipboard?.writeText(shareText);
      showToast('链接已复制');
    } catch {
      showToast('已模拟转发');
    }
  };

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>匿名留言板</h1>
          <p>内部员工反馈</p>
        </div>
      </header>

      <InlineComposer onSubmit={handleCreateMessage} onToast={showToast} />

      <section className="toolbar card-surface" aria-label="留言筛选">
        <nav className="category-tabs" aria-label="分类">
          {TAB_CATEGORIES.map((category) => (
            <button
              className={`btn btn-filter${activeCategory === category ? ' active' : ''}`}
              type="button"
              key={category}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </nav>

        <div className="filter-row">
          <input
            className="control-field search-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜索标题或正文"
            aria-label="搜索标题或正文"
          />
          <select
            className="control-field sort-select"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            aria-label="排序方式"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="message-list" aria-label="留言列表">
        {visibleMessages.length === 0 ? (
          <div className="empty-state">没有匹配的留言</div>
        ) : (
          visibleMessages.map((message) => {
            const isCommentSectionVisible = message.comments.length > 0 && !hiddenCommentIds.has(message.id);

            return (
              <MessageCard
                key={message.id}
                message={message}
                isLiked={likedMessageIds.has(message.id)}
                isComposerOpen={composerMessageId === message.id}
                isCommentSectionVisible={isCommentSectionVisible}
                commentReactionSelections={commentReactionSelections}
                onToggleLike={handleToggleLike}
                onToggleComments={handleToggleComments}
                onSelectCategory={handleSelectCategory}
                onShare={handleShareMessage}
                onToast={showToast}
                onAddComment={handleAddComment}
                onAddCommentReply={handleAddCommentReply}
                onDeleteComment={handleDeleteOwnComment}
                onToggleCommentReaction={handleToggleCommentReaction}
              />
            );
          })
        )}
      </section>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </main>
  );
}
