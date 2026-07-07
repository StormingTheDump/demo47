import { useRef, useState } from 'react';
import { CATEGORIES } from '../types';
import type { Category, MessageInput } from '../types';

interface InlineComposerProps {
  onSubmit: (input: MessageInput) => void;
  onToast: (message: string) => void;
}

type ToolIconName = 'emoji' | 'image' | 'video' | 'topic';

const initialCategory: Category = '工作类';
const emojis = ['😀', '👍', '💡', '🎉', '❤️', '👏'];
const maxImages = 9;

export function InlineComposer({ onSubmit, onToast }: InlineComposerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [videoName, setVideoName] = useState('');

  const canSubmit = Boolean(title.trim() || body.trim() || imageNames.length > 0 || videoName);

  const appendToBody = (value: string) => {
    setBody((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${value}`);
    setError('');
  };

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setImageNames((current) => {
      const next = [...current, ...files.map((file) => file.name)].slice(0, maxImages);
      if (current.length + files.length > maxImages) {
        onToast('单次最多添加 9 张图片');
      }
      return next;
    });
    event.target.value = '';
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (videoName) {
      onToast('单次最多添加 1 个视频');
    }
    setVideoName(file.name);
    event.target.value = '';
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setError('请输入要发布的内容');
      return;
    }

    const attachmentSummary = [
      imageNames.length > 0 ? `[图片 ${imageNames.length} 张]` : '',
      videoName ? `[视频 ${videoName}]` : '',
    ].filter(Boolean);

    onSubmit({
      category,
      title,
      body: [body, ...attachmentSummary].filter(Boolean).join('\n'),
      authorName: '匿名用户',
    });
    setTitle('');
    setBody('');
    setError('');
    setIsEmojiOpen(false);
    setImageNames([]);
    setVideoName('');
  };

  return (
    <form className="inline-composer card-surface" onSubmit={handleSubmit}>
      <input
        className="composer-title control-plain"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          if (error) {
            setError('');
          }
        }}
        placeholder="What would you like to share?"
        aria-label="留言标题"
      />

      <textarea
        className="composer-body control-plain"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          if (error) {
            setError('');
          }
        }}
        placeholder="写下你的想法"
        aria-label="留言正文"
        rows={3}
      />

      <div className="composer-meta-row">
        <select className="control-field composer-select" value={category} onChange={(event) => setCategory(event.target.value as Category)}>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <span className="composer-error">{error}</span>
      </div>

      {(imageNames.length > 0 || videoName) && (
        <div className="attachment-list" aria-label="已添加附件">
          {imageNames.map((name, index) => (
            <button
              className="attachment-chip"
              type="button"
              key={`${name}-${index}`}
              onClick={() => setImageNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              title="点击移除图片"
            >
              图片 {index + 1}
            </button>
          ))}
          {videoName ? (
            <button className="attachment-chip" type="button" onClick={() => setVideoName('')} title="点击移除视频">
              视频 1
            </button>
          ) : null}
        </div>
      )}

      <div className="composer-footer">
        <div className="composer-tools" aria-label="发布工具">
          <div className="composer-tool-wrap">
            <button
              className="icon-button tool-icon icon-smile"
              type="button"
              title="表情"
              onClick={() => setIsEmojiOpen((current) => !current)}
              aria-expanded={isEmojiOpen}
            >
              <ToolSvg name="emoji" />
            </button>
            {isEmojiOpen ? (
              <div className="composer-emoji-panel" role="group" aria-label="选择表情">
                {emojis.map((emoji) => (
                  <button className="emoji-option" type="button" key={emoji} onClick={() => appendToBody(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            className="icon-button tool-icon icon-image"
            type="button"
            title="添加图片（最多 9 张）"
            onClick={() => imageInputRef.current?.click()}
          >
            <ToolSvg name="image" />
          </button>
          <button
            className="icon-button tool-icon icon-video"
            type="button"
            title="添加视频（最多 1 个）"
            onClick={() => {
              if (videoName) {
                onToast('单次最多添加 1 个视频');
                return;
              }
              videoInputRef.current?.click();
            }}
          >
            <ToolSvg name="video" />
          </button>
          <button className="icon-button tool-icon icon-topic" type="button" title="话题" onClick={() => appendToBody('#话题#')}>
            <ToolSvg name="topic" />
          </button>
          <input ref={imageInputRef} className="hidden-file-input" type="file" accept="image/*" multiple onChange={handleImagesChange} />
          <input ref={videoInputRef} className="hidden-file-input" type="file" accept="video/*" onChange={handleVideoChange} />
        </div>

        <div className="composer-submit-area">
          <div className="composer-profile" aria-label="发布身份">
            <span className="composer-avatar">匿</span>
            <span>匿名发布</span>
          </div>
          <button className="btn btn-primary composer-post" type="submit" disabled={!canSubmit}>
            Post
          </button>
        </div>
      </div>
    </form>
  );
}

function ToolSvg({ name }: { name: ToolIconName }) {
  if (name === 'emoji') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="9" cy="10" r="1" />
        <circle cx="15" cy="10" r="1" />
        <path d="M8.5 14c1.8 2 5.2 2 7 0" />
      </svg>
    );
  }

  if (name === 'image') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M6.5 17l4.2-4.2 3 3 2-2L19 17" />
      </svg>
    );
  }

  if (name === 'video') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="12" height="12" rx="2" />
        <path d="M16 10l4-2v8l-4-2z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4L7.8 20" />
      <path d="M16.2 4L14 20" />
      <path d="M5 9h15" />
      <path d="M4 15h15" />
    </svg>
  );
}
