import express, { type Express } from 'express'
import type { Kysely } from 'kysely'
import { errorHandler } from './api/api'
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

  app.use(errorHandler)

  return app
}
