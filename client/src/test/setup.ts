import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw-server'

// MSW 攔在 fetch 這一層，所以 component 用的是真的 fetch，
// 測試不需要為了可 mock 而預先抽出 API 介面。
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
