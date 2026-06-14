interface OwnerHeaderProps {
  displayName: string;
  avatar: string;
  bio: string | null;
}

/** お知らせ上部の運営者紹介カード（設計書 §7.1.4、テラコッタグラデーション）。 */
export function OwnerHeader({ displayName, avatar, bio }: OwnerHeaderProps) {
  return (
    <div className="rounded-card bg-gradient-to-br from-terracotta to-mustard p-5 text-cream">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/20 text-2xl">
          {avatar}
        </span>
        <div>
          <p className="text-xs opacity-90">運営</p>
          <p className="text-lg font-medium">{displayName}</p>
        </div>
      </div>
      {bio && <p className="mt-3 text-sm leading-relaxed opacity-95">{bio}</p>}
    </div>
  );
}
