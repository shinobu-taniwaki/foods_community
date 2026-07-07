import 'server-only';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

export type AuditActionType =
  | 'user_suspended'
  | 'user_deleted'
  | 'user_restored'
  | 'user_plan_changed'
  | 'post_edited_by_admin'
  | 'post_deleted_by_admin'
  | 'content_deleted_by_admin'
  | 'invitation_created'
  | 'invitation_revoked'
  | 'invitation_resent'
  | 'channel_created'
  | 'channel_updated'
  | 'channel_deleted'
  | 'product_genre_created'
  | 'product_genre_updated'
  | 'product_genre_deleted'
  | 'post_tag_created'
  | 'post_tag_merged'
  | 'post_tag_deleted'
  | 'broadcast_sent'
  | 'email_changed'
  | 'password_changed';

export type AuditTargetType =
  | 'profile'
  | 'post'
  | 'content'
  | 'invitation'
  | 'channel'
  | 'product_genre'
  | 'post_tag'
  | 'broadcast'
  | 'auth';

/**
 * 監査ログを記録（設計書 §17）。
 * admin 本人の認証クライアントで INSERT（RLS: is_admin() AND actor_id=auth.uid()）。
 * 失敗しても主処理は止めない（ログのみ）。
 */
export async function writeAuditLog(params: {
  actorId: string;
  actionType: AuditActionType;
  targetType: AuditTargetType;
  targetId?: string | null;
  payload?: Json;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from('audit_logs').insert({
    actor_id: params.actorId,
    action_type: params.actionType,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    payload: params.payload ?? {},
  });
}

/**
 * システムイベント（member 本人操作など admin 以外が actor のもの）の監査ログ。
 * RLS の INSERT ポリシーは admin 限定のため service_role で記録する
 * （rls_policies.sql の audit_logs_insert_policy コメント参照）。
 * こちらも失敗で主処理は止めない。
 */
export async function writeSystemAuditLog(params: {
  actorId: string;
  actionType: AuditActionType;
  targetType: AuditTargetType;
  targetId?: string | null;
  payload?: Json;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from('audit_logs').insert({
    actor_id: params.actorId,
    action_type: params.actionType,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    payload: params.payload ?? {},
  });
}
