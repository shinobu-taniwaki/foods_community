import Image from 'next/image';

interface BrandLogoProps {
  /** 表示幅（px）。高さは元画像比率（1300:460）で自動算出。 */
  width?: number;
  priority?: boolean;
  className?: string;
}

const LOGO_RATIO = 460 / 1300;

/**
 * MCC ブランドロゴ（横型）。ヘッダー・ログイン・招待などユーザーに見える箇所で共用。
 * 原本は public/brand/mcc-logo-horizontal-outlined.png。
 */
export function BrandLogo({
  width = 240,
  priority = false,
  className,
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/mcc-logo-horizontal-outlined.png"
      alt="マーケティングCampコミュニティ"
      width={width}
      height={Math.round(width * LOGO_RATIO)}
      priority={priority}
      className={className}
    />
  );
}
