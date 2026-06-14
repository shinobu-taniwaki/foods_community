'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { updateNotificationPreferences } from './actions';

export interface NotificationPrefs {
  new_post: boolean;
  new_announcement: boolean;
  comment_on_my_post: boolean;
  like_on_my_post: boolean;
}

interface ToggleItem {
  name: keyof NotificationPrefs;
  label: string;
  description: string;
}

const TOGGLE_ITEMS: ToggleItem[] = [
  {
    name: 'new_post',
    label: '掲示板の新しい投稿',
    description: '仲間が新しい投稿をしたときにお知らせします。',
  },
  {
    name: 'new_announcement',
    label: '運営からのお知らせ',
    description: '新しいお知らせが公開されたときにお知らせします。',
  },
  {
    name: 'comment_on_my_post',
    label: '自分の投稿へのコメント',
    description: 'あなたの投稿にコメントが付いたときにお知らせします。',
  },
  {
    name: 'like_on_my_post',
    label: '自分の投稿へのいいね',
    description: 'あなたの投稿にいいねが付いたときにお知らせします。',
  },
];

/** 通知設定フォーム。OFF 不可の種別は説明のみ表示する。 */
export function NotificationSettingsForm({ prefs }: { prefs: NotificationPrefs }) {
  const [state, action] = useFormState(updateNotificationPreferences, null);

  return (
    <form action={action} className="space-y-6">
      {state?.ok && <Alert variant="success">通知設定を保存しました。</Alert>}
      {state && !state.ok && <Alert variant="error">{state.error.message}</Alert>}

      <Card className="divide-y divide-foreground/10 p-0">
        {TOGGLE_ITEMS.map((item) => (
          <label
            key={item.name}
            className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4"
          >
            <span className="min-w-0">
              <span className="block font-medium">{item.label}</span>
              <span className="mt-1 block text-sm text-foreground/60">
                {item.description}
              </span>
            </span>
            <input
              type="checkbox"
              name={item.name}
              defaultChecked={prefs[item.name]}
              className="mt-1 h-6 w-6 shrink-0 accent-terracotta"
            />
          </label>
        ))}

        {/* 運営からの重要連絡は OFF にできない */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 text-foreground/50">
          <span className="min-w-0">
            <span className="block font-medium">運営からの重要なお知らせ</span>
            <span className="mt-1 block text-sm">
              大切な連絡のため、常にお届けします（オフにできません）。
            </span>
          </span>
          <input
            type="checkbox"
            checked
            disabled
            aria-label="運営からの重要なお知らせ（常にオン）"
            className="mt-1 h-6 w-6 shrink-0 accent-terracotta"
          />
        </div>
      </Card>

      <SubmitButton>設定を保存</SubmitButton>
    </form>
  );
}
