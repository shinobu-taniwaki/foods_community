'use client';

import { useRef, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { createPostComment } from '@/app/(app)/feed/actions';

export function PostCommentForm({
  postId,
  canComment,
}: {
  postId: string;
  canComment: boolean;
}) {
  const [state, action] = useFormState(createPostComment, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (!canComment) {
    return (
      <Alert variant="info">
        コメントはスタンダードプラン以上でご利用いただけます。
      </Alert>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />
      {state && !state.ok && (
        <Alert variant="error">{state.error.message}</Alert>
      )}
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
