import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Kysely } from 'kysely'
import { createApp } from './app'
import { createTestDatabase } from './db/test-database'
import type { Database } from './db/schema'

let db: Kysely<Database>

// 這個檔案測的是錯誤信封的兜底，沒有任何測試會寫資料，所以不需要隔離。
beforeAll(async () => {
  db = await createTestDatabase()
})
afterAll(async () => {
  await db.destroy()
})

describe('沒有被任何端點命中的路徑', () => {
  // 計畫：在所有路由之後、error middleware 之前加一條 app.use，
  // 無條件丟 ApiError(404, 'ROUTE_NOT_FOUND', 'route not found')。
  //
  // 順序很重要：放在路由之後才不會攔掉正常請求，放在 error middleware
  // 之前才丟得進去。
  //
  // 沒有這條的話 Express 會吐它預設的 HTML 錯誤頁，呼叫端拿 res.json()
  // 解析會直接炸——契約承諾「所有錯誤回應都是同一個形狀，包含沒有被任何
  // 端點命中的路徑在內」，這顆就是在守那句話。
  it('回 404 與 ROUTE_NOT_FOUND', async () => {
    const res = await request(createApp(db)).get('/api/no-such-thing')

    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual({
      code: 'ROUTE_NOT_FOUND',
      message: 'route not found',
      data: {},
    })
  })
})

describe('body 不是合法的 JSON', () => {
  // 計畫：在 errorHandler 裡多認一種錯誤。express.json() 解析失敗時丟出的
  // 是帶 type: 'entity.parse.failed' 的 SyntaxError，把它轉成
  // ApiError(400, 'VALIDATION_FAILED', 'invalid request body')。
  //
  // data 是空物件而不是 { 欄位名: [...] }：解析都失敗了，根本還不知道有
  // 哪些欄位。契約規定 data 必填、允許空物件，正好涵蓋這種情況。
  //
  // 現在這個錯誤會走 errorHandler 的 next(err) 交還 Express，回的是預設的
  // HTML 錯誤頁，呼叫端解析會炸。
  it('回 400 與 VALIDATION_FAILED', async () => {
    const res = await request(createApp(db))
      .post('/api/patients/1/orders')
      .set('Content-Type', 'application/json')
      .send('{ 這不是 JSON')

    expect(res.status).toBe(400)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'invalid request body',
      data: {},
    })
  })
})
