# ============================================================
# MCC Next.js アプリ用 Dockerfile（オンプレ Self-hosted 向け）
# next.config.mjs の output: 'standalone' を利用し最小ランタイムを出力する。
#
# 注意: NEXT_PUBLIC_* はビルド時にバンドルへインライン展開される。
#   そのため build 時に build-arg で渡す必要がある（runtime のみでは反映されない）。
# ============================================================

# ---- 1. 依存解決 ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- 2. ビルド ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* はビルド時にインライン展開されるため build-arg で受け取る
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_BETA_MODE
ARG NEXT_PUBLIC_BETA_END_DATE
ARG NEXT_PUBLIC_FORM_PLAN_UPGRADE
ARG NEXT_PUBLIC_FORM_WITHDRAWAL
ARG NEXT_PUBLIC_FORM_INQUIRY
ARG NEXT_PUBLIC_FORM_BUG_REPORT
ARG NEXT_PUBLIC_FORM_SEMINAR
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---- 3. 実行 ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root ユーザーで実行
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# standalone 出力をコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
