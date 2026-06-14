'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  adminChangeMemberPlan,
  adminSuspendMember,
  adminRestoreMember,
  adminDeleteMember,
} from '../actions';

interface MemberActionsProps {
  userId: string;
  currentPlan: string | null;
  status: string;
}

export function MemberActions({ userId, currentPlan, status }: MemberActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [plan, setPlan] = useState(currentPlan ?? 'standard');

  const run = (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, okText: string) => {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error?.message ?? '失敗しました' });
      }
    });
  };

  return (
    <Card className="space-y-4">
      <Heading level={3}>管理操作</Heading>
      {msg && <Alert variant={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}

      {/* プラン変更 */}
      <div className="space-y-2">
        <p className="text-sm font-medium">プラン変更</p>
        <div className="flex gap-2">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="min-h-[48px] flex-1 rounded border border-foreground/20 bg-white px-3 text-base"
          >
            <option value="trial">お試し</option>
            <option value="standard">スタンダード</option>
            <option value="premium">プレミアム</option>
          </select>
          <Button
            disabled={pending}
            onClick={() => run(() => adminChangeMemberPlan(userId, plan), 'プランを変更しました')}
          >
            変更
          </Button>
        </div>
      </div>

      {/* ステータス操作 */}
      <div className="space-y-2">
        <p className="text-sm font-medium">ステータス</p>
        {status === 'active' && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => adminSuspendMember(userId, '1_week'), '1週間停止しました')}
            >
              1週間停止
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => adminSuspendMember(userId, '1_month'), '1ヶ月停止しました')}
            >
              1ヶ月停止
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                const reason = prompt('退会理由を入力してください');
                if (reason) run(() => adminDeleteMember(userId, reason), '退会させました');
              }}
            >
              退会させる
            </Button>
          </div>
        )}
        {(status === 'suspended' || status === 'deleted') && (
          <Button
            disabled={pending}
            onClick={() => run(() => adminRestoreMember(userId), '復活させました')}
          >
            復活させる
          </Button>
        )}
      </div>
    </Card>
  );
}
