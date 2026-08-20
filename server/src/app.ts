import express, { type Express } from 'express'
import type { Kysely } from 'kysely'
import { ApiError, errorHandler } from './api/api'
import { orderRouter } from './api/order'
import { patientRouter } from './api/patient'
import type { Database } from './db/schema'

/**
 * 回傳一個尚未 listen 的 Express app，讓 supertest 可以直接掛上去，
 * 測試不必真的開 port。
 */
export function createApp(db: Kysely<Database>): Express {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', patientRouter(db))
  app.use('/api', orderRouter(db))

  // 放在所有路由之後才不會攔掉正常請求，放在 errorHandler 之前才丟得進去。
  // 沒有這條的話 Express 會吐預設的 HTML 錯誤頁，契約承諾的「所有錯誤回應
  // 都是同一個形狀」就不成立。
  app.use(() => {
    throw new ApiError(404, 'ROUTE_NOT_FOUND', 'route not found')
  })

  app.use(errorHandler)

  return app
}
