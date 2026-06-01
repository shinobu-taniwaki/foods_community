'use client';

import { useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { updateProductGenres } from '../../actions';

interface Genre {
  id: string;
  label: string;
  iconEmoji: string;
}

interface GenresFieldProps {
  allGenres: Genre[];
  selectedIds: string[];
}

const MAX = 5;

/** 販売ジャンルを最大5個までトグル選択して保存する。 */
export function GenresField({ allGenres, selectedIds }: GenresFieldProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const toggle = (id: string) => {
    setMessage(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) {
        setMessage({
          type: 'error',
          text: `販売ジャンルは最大${MAX}個までです。`,
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const save = () => {
    startTransition(async () => {
      const result = await updateProductGenres(selected);
      setMessage(
        result.ok
          ? { type: 'success', text: '保存しました。' }
          : { type: 'error', text: result.error.message },
      );
    });
  };

  return (
    <Card className="space-y-4">
      <Heading level={3}>販売ジャンル（最大{MAX}個）</Heading>
      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {allGenres.map((g) => {
          const active = selected.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              aria-pressed={active}
              className={cn(
                'flex min-h-[44px] items-center gap-1 rounded-full border px-4 text-base',
                active
                  ? 'border-terracotta bg-terracotta/10 text-terracotta'
                  : 'border-foreground/15 text-foreground/70',
              )}
            >
              <span aria-hidden>{g.iconEmoji}</span>
              {g.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-foreground/50">
        {selected.length} / {MAX} 個選択中
      </p>
      <Button onClick={save} disabled={pending}>
        {pending ? '保存中…' : '販売ジャンルを保存'}
      </Button>
    </Card>
  );
}
