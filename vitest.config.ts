import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // 'server-only' は React Server 以外で import するとエラーになるため
      // テストでは空モジュールに差し替える
      'server-only': path.resolve(__dirname, 'test/stubs/server-only.ts'),
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
