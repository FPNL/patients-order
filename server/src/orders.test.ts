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

  // 計畫：
  // 1. 這條 handler 改成先 selectFrom('patients') 查該 id 存在與否。
  //    存在就照舊回 []（上一顆的行為不變），不存在就走錯誤路徑。
  // 2. 錯誤路徑丟出一個帶 code / message / status 的錯誤，交給一個新的
  //    error middleware 統一序列化成 { code, message, data }。這顆只需要
  //    NOT_FOUND 這一種，其餘三種 code 留給第 14、15、16 顆。
  //
  // message 斷言的是 'patient not found'——契約規定 message 是英文、給
  // 開發者與紀錄檔看、同一個 code 在不同情境文字可能不同，所以這個字串
  // 是我們自己決定的契約，不是函式庫產物，可以直接寫死。
  //
  // 契約規定 data 必填、NOT_FOUND 時是空物件，所以這裡斷言完整的 body
  // 而不只是 code。
  it('住民不存在時回 404 與 NOT_FOUND', async () => {
    const res = await request(createApp(db)).get('/api/patients/99/orders')

    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: 'patient not found',
      data: {},
    })
  })
})
