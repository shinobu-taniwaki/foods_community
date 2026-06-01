import {
  Button,
  buttonClassName,
  type ButtonVariant,
} from '@/components/ui/button';
import { getFormUrl, type FormKey } from '@/lib/forms';

interface ExternalFormLinkProps {
  formKey: FormKey;
  label: string;
  prefill?: Record<string, string | undefined>;
  variant?: ButtonVariant;
}

/**
 * Google フォームを新規タブで開くリンク（設計書 §10.3）。
 * URL 未設定時は「準備中」の無効表示。
 */
export function ExternalFormLink({
  formKey,
  label,
  prefill,
  variant = 'primary',
}: ExternalFormLinkProps) {
  const url = getFormUrl(formKey, prefill);

  if (!url) {
    return (
      <Button variant="ghost" disabled>
        {label}（準備中）
      </Button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClassName({ variant })}
    >
      {label}
    </a>
  );
}
