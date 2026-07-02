'use client';

/* eslint-disable @next/next/no-img-element */

import { useRef, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { compressImage } from '@/lib/image-compression';
import { getErrorMessage } from '@/lib/result';
import { uploadAvatarImage, removeAvatarImage } from '../../actions';

interface AvatarUploaderProps {
  /** 現在のアバター画像の配信 URL（未設定なら null）。 */
  currentImageUrl: string | null;
  /** 画像未設定時に表示する絵文字アイコン。 */
  fallbackEmoji: string;
}

/**
 * アバター画像のアップロード（dev-phases Phase 1 残項目 / 設計書 §12.3）。
 * 選択 → クライアント圧縮（512px/JPEG）→ FormData で Server Action へ送信。
 * ブラウザは Supabase に直接アクセスしない（single-domain-image-proxy.md §4）。
 */
export function AvatarUploader({
  currentImageUrl,
  fallbackEmoji,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setIsBusy(true);
    try {
      const compressed = await compressImage(file, 'avatar');
      const formData = new FormData();
      formData.append('file', compressed);

      const result = await uploadAvatarImage(formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setImageUrl(result.data.imageUrl);
    } catch (cause: unknown) {
      setError(`画像の処理に失敗しました（${getErrorMessage(cause)}）`);
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeAvatarImage();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setImageUrl(null);
    });
  }

  return (
    <div className="space-y-2">
      <Label>プロフィール写真（任意）</Label>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-foreground/15 bg-white text-3xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="プロフィール写真"
              className="h-full w-full object-cover"
            />
          ) : (
            fallbackEmoji
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {isBusy ? 'アップロード中…' : '写真を選ぶ'}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={handleRemove}
            >
              写真を外す
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-foreground/60">
        写真は自動で小さく圧縮されます（JPEG / PNG / WebP）。
        写真がないときは、下で選んだ絵文字が表示されます。
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
