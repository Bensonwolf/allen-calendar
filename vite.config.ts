import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 使用相對路徑，讓打包結果放在 GitHub Pages 的子路徑（/專案名稱/）也能正常載入
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
