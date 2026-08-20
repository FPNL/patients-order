// vitest/config 的 defineConfig 是 vite 那支的超集，多認得 test 欄位，
// 讓 vite 與 vitest 共用同一份設定。
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 開發時前端打 /api/*，一律轉給 Express，避免處理 CORS。
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
