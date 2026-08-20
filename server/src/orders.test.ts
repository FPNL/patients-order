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

describe('GET /api/patients/:patientId/orders', () => {
  // 計畫：在 createApp 加一條
  // app.get('/api/patients/:patientId/orders')，無條件回 res.json([])。
  //
  // 就這樣，不建 orders 表、也不查 patients 確認住民存在。那些都還沒有
  // 測試要求：住民存在性檢查會被下一顆（住民不存在回 404）逼出來，
  // orders 表會被 POST 那顆逼出來。
  //
  // 這顆刻意選「住民存在但沒有醫囑」：契約明寫這種情況回空陣列而不是
  // NOT_FOUND，是兩者最容易被實作搞混的地方。先把 200 [] 釘住，
  // 下一顆再釘 404，兩者的界線就被測試框死了。
  it('住民存在但尚未有醫囑時回 200 與空陣列', async () => {
    const res = await request(createApp(db)).get('/api/patients/1/orders')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual([])
  })
})
