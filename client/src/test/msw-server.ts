import { setupServer } from 'msw/node'

// handler 一律由各測試自己用 server.use(...) 宣告，
// 這裡不放預設 handler：沒宣告就打到網路，會被 onUnhandledRequest: 'error' 擋下來。
export const server = setupServer()
