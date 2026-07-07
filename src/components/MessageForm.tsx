import { useState } from 'react';
import { CATEGORIES } from '../types';
import type { Category, MessageInput } from '../types';

interface MessageFormProps {
  onSubmit: (input: MessageInput) => void;
  onClose: () => void;
}

const initialCategory: Category = '工作类';

export function MessageForm({ onSubmit, onClose }: MessageFormProps) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState({ title: '', body: '' });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = {
      title: title.trim() ? '' : '请输入标题',
      body: body.trim() ? '' : '请输入正文',
    };

    setErrors(nextErrors);

    if (nextErrors.title || nextErrors.body) {
      return;
    }

    onSubmit({
      category,
      title,
      body,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="message-form-panel" role="dialog" aria-modal="true" aria-labelledby="message-form-title" onClick={(event) => event.stopPropagation()}>
        <div className="form-panel-header">
          <h2 id="message-form-title">发布留言</h2>
          <button className="ghost-button" type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <form className="message-form" onSubmit={handleSubmit} noValidate>
          <label>
            分类
            <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            标题
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (errors.title) {
                  setErrors((current) => ({ ...current, title: '' }));
                }
              }}
              placeholder="输入留言标题"
            />
            <span className="field-error">{errors.title}</span>
          </label>

          <label>
            正文
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                if (errors.body) {
                  setErrors((current) => ({ ...current, body: '' }));
                }
              }}
              placeholder="写下你的想法"
              rows={6}
            />
            <span className="field-error">{errors.body}</span>
          </label>

          {category === 'CEO 信箱' ? (
            <p className="ceo-form-note">你的留言将以匿名方式提交，用于管理层了解员工真实反馈。</p>
          ) : null}

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              取消
            </button>
            <button className="primary-button" type="submit">
              提交
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
