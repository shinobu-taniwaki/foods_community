'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { TagInput } from '@/components/posts/tag-input';
import { PostImagePicker } from '@/components/posts/post-image-picker';
import type { Result } from '@/lib/result';

interface ChannelOption {
  id: string;
  label: string;
}

interface PostFormProps {
  action: (
    prev: Result<null> | null,
    formData: FormData,
  ) => Promise<Result<null>>;
  channels: ChannelOption[];
  isAdmin: boolean;
  mode: 'create' | 'edit';
  defaultValues?: {
    id?: string;
    channelId?: string;
    title?: string;
    content?: string;
    tags?: string[];
  };
}

export function PostForm({
  action,
  channels,
  isAdmin,
  mode,
  defaultValues,
}: PostFormProps) {
  const [state, formAction] = useFormState(action, null);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        {state && !state.ok && (
          <Alert variant="error">{state.error.message}</Alert>
        )}
        {defaultValues?.id && (
          <input type="hidden" name="id" value={defaultValues.id} />
        )}

        {mode === 'create' ? (
          <div>
            <Label htmlFor="channelId" required>
              チャンネル
            </Label>
            <select
              id="channelId"
              name="channelId"
              defaultValue={defaultValues?.channelId ?? channels[0]?.id}
              required
              className="min-h-[48px] w-full rounded border border-foreground/20 bg-white px-4 text-base"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <Label htmlFor="title" required>
            タイトル（100文字まで）
          </Label>
          <Input
            id="title"
            name="title"
            defaultValue={defaultValues?.title}
            maxLength={100}
            required
          />
        </div>

        <div>
          <Label htmlFor="content" required>
            本文（5,000文字まで）
          </Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={defaultValues?.content}
            rows={10}
            maxLength={5000}
            required
          />
        </div>

        <div>
          <Label>タグ（最大5個）</Label>
          <TagInput name="tagLabels" defaultTags={defaultValues?.tags} />
        </div>

        {mode === 'create' && (
          <div>
            <Label>写真（任意・3枚まで）</Label>
            <PostImagePicker name="images" />
          </div>
        )}

        {isAdmin && (
          <div>
            <Label htmlFor="youtubeUrl">
              YouTube 動画 URL（任意・運営のみ）
            </Label>
            <Input
              id="youtubeUrl"
              name="youtubeUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        )}

        <SubmitButton size="lg" className="w-full">
          {mode === 'create' ? '投稿する' : '更新する'}
        </SubmitButton>
      </form>
    </Card>
  );
}
