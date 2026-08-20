import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Kysely } from 'kysely'
import { createApp } from './app'
import { createTestDatabase } from './db/test-database'
import type { Database } from './db/schema'

let db: Kysely<Database>

beforeAll(async () => {
  db = await createTestDatabase()
})
afterAll(async () => {
  await db.destroy()
})

describe('server 測試骨架', () => {
  it('supertest 可以直接打未 listen 的 app', async () => {
    const res = await request(createApp(db)).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
