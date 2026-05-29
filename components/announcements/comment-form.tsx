'use client';

import { useRef, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { createAnnouncementComment } from '@/app/(app)/announcements/actions';

export function CommentForm({ contentId }: { contentId: string }) {
  const [state, action] = useFormState(createAnnouncementComment, null);
  const formRef = useRef<HTMLFormElement>(null);

  // 投稿成功時にフォームをリセット
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="contentId" value={contentId} />
      {state && !state.ok && <Alert variant="error">{state.error.message}</Alert>}
      <Textarea
        name="body"
        rows={3}
        maxLength={1000}
        placeholder="コメントを書く…"
        required
        aria-label="コメント"
      />
      <SubmitButton>コメントする</SubmitButton>
    </form>
  );
}
