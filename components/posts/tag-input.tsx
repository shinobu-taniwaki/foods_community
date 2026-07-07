'use client';

import { useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  name: string;
  defaultTags?: string[];
  max?: number;
}

/**
 * タグ入力（チップ式）。Enter/カンマで確定。最大 max 個。
 * 確定済みタグはカンマ区切りで hidden input に格納し Server Action へ渡す。
 */
export function TagInput({ name, defaultTags = [], max = 5 }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(defaultTags.slice(0, max));
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const label = raw.trim();
    if (!label) return;
    if (tags.length >= max) return;
    if (tags.includes(label)) return;
    setTags([...tags, label]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 日本語 IME の変換確定 Enter ではタグを確定しない
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <input type="hidden" name={name} value={tags.join(',')} />
      <div className="flex flex-wrap items-center gap-2 rounded border border-foreground/20 bg-white p-2">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 rounded-full bg-terracotta/10 px-2 py-1 text-sm text-terracotta"
          >
            #{t}
            <button
              type="button"
              onClick={() => setTags(tags.filter((x) => x !== t))}
              aria-label={`${t} を削除`}
              className="text-terracotta/70"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < max && (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => add(draft)}
            maxLength={50}
            placeholder={tags.length === 0 ? 'タグを入力（Enter で追加）' : ''}
            className="min-h-[36px] flex-1 bg-transparent px-1 text-base focus:outline-none"
          />
        )}
      </div>
      <p className="mt-1 text-sm text-foreground/50">
        {tags.length} / {max} 個（例: MEO、LINE公式）
      </p>
    </div>
  );
}
