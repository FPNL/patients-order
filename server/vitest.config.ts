import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 每個測試檔一個獨立的 PGlite 實例，檔案之間天然隔離，
    // 所以放心讓 vitest 平行跑。
    setupFiles: [],
  },
})
