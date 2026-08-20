import express, { type Express } from 'express'
import type { Kysely } from 'kysely'
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

  app.get('/api/patients', async (_req, res) => {
    const patients = await db
      .selectFrom('patients')
      .select(['id', 'name'])
      .orderBy('id')
      .execute()

    res.json(patients)
  })

  app.get('/api/patients/:patientId/orders', (_req, res) => {
    res.json([])
  })

  return app
}
