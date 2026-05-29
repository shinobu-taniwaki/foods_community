import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind クラスを安全に結合するヘルパー。
 * 競合するユーティリティクラスは後勝ちでマージされる。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
