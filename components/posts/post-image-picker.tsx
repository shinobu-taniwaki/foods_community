'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/image-compression';
import { getErrorMessage } from '@/lib/result';

export const POST_IMAGE_MAX = 3;

interface PickedImage {
  file: File;
  previewUrl: string;
}

interface PostImagePickerProps {
  /** フォーム送信時のフィールド名（formData.getAll で取得）。 */
  name: string;
}

/**
 * 投稿の画像添付（最大3枚）。
 * 選択時にクライアントで圧縮（1600px/JPEG）し、hidden の file input に
 * DataTransfer で書き戻すことで、通常のフォーム送信（Server Action）に載せる。
 * ブラウザから Supabase へ直接アップロードしない（single-domain-image-proxy.md §4）。
 */
export function PostImagePicker({ name }: PostImagePickerProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // 圧縮済みファイルを hidden input へ反映（フォーム送信に含める）
  useEffect(() => {
    if (!hiddenRef.current) return;
    const transfer = new DataTransfer();
    for (const image of images) transfer.items.add(image.file);
    hiddenRef.current.files = transfer.files;
  }, [images]);

  // プレビュー URL の解放
  useEffect(() => {
    return () => {
      for (const image of images) URL.revokeObjectURL(image.previewUrl);
    };
    // アンマウント時のみ解放（個別削除時は remove() で解放する）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelect(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setError(null);

    const remaining = POST_IMAGE_MAX - images.length;
    if (selected.length > remaining) {
      setError(`画像は${POST_IMAGE_MAX}枚までです。`);
    }

    setIsBusy(true);
    try {
      const added: PickedImage[] = [];
      for (const file of Array.from(selected).slice(0, Math.max(remaining, 0))) {
        const compressed = await compressImage(file, 'post');
        // browser-image-compression は Blob を返すことがあり、
        // DataTransfer.items.add() は File 以外を受け付けないため明示的に包む
        const asFile = new File(
          [compressed],
          file.name.replace(/\.[^.]+$/, '') + '.jpg',
          { type: 'image/jpeg' },
        );
        added.push({
          file: asFile,
          previewUrl: URL.createObjectURL(asFile),
        });
      }
      if (added.length > 0) setImages((prev) => [...prev, ...added]);
    } catch (cause: unknown) {
      setError(`画像の処理に失敗しました（${getErrorMessage(cause)}）`);
    } finally {
      setIsBusy(false);
      if (pickerRef.current) pickerRef.current.value = '';
    }
  }

  function remove(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  return (
    <div className="space-y-2">
      {error && <Alert variant="error">{error}</Alert>}

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image, i) => (
            <li key={image.previewUrl} className="space-y-1">
              <img
                src={image.previewUrl}
                alt={`添付画像 ${i + 1}`}
                className="aspect-square w-full rounded border border-foreground/10 object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex min-h-[44px] w-full items-center justify-center text-sm text-terracotta underline"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {images.length < POST_IMAGE_MAX && (
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={() => pickerRef.current?.click()}
        >
          {isBusy
            ? '画像を圧縮中…'
            : `写真を追加（あと${POST_IMAGE_MAX - images.length}枚）`}
        </Button>
      )}
      <p className="text-sm text-foreground/60">
        写真は自動で小さく圧縮されます（JPEG / PNG / WebP・{POST_IMAGE_MAX}
        枚まで）。
      </p>

      <input
        ref={pickerRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void handleSelect(e.target.files)}
      />
      <input ref={hiddenRef} type="file" name={name} multiple className="hidden" />
    </div>
  );
}
