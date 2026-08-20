import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { PGlite } from '@electric-sql/pglite'
import { Kysely } from 'kysely'
import { createApp } from '../app'
import { useConfig } from '../config'
import { useDatabase } from '../db/database'
import { PGliteDialect } from '../db/pglite-dialect'
import { createTestDatabase } from '../db/test-database'
import type { Database } from '../db/schema'

// createApp 讀的是 config 與 database 的 Default，所以測試在這裡備妥它們。
// Vitest 預設每個測試檔有獨立的 module registry，這些全域不會跨檔互相干擾。
const testConfig = {
  port: 0,
  database: { url: 'unused: 測試走 PGlite' },
  max_request_body: 1024 * 1024,
  shutdown_timeout: 10_000,
}

let db: Kysely<Database>

// 這個檔案測的是錯誤信封的兜底，沒有任何測試會寫資料，所以不需要隔離。
beforeAll(async () => {
  db = await createTestDatabase()
  useDatabase(db)
  useConfig(testConfig)
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
    const res = await request(createApp()).get('/api/no-such-thing')

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
    const res = await request(createApp())
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

describe('未預期的錯誤', () => {
  // 計畫：errorHandler 的最後不再 next(err)，改成一律回
  // { code: 'INTERNAL_ERROR', message: 'internal server error', data: {} }
  // 並帶 500。
  //
  // 製造錯誤的方式是給 app 一個沒有套用 migration 的資料庫，然後打正常的
  // 端點——Postgres 會回 'relation "patients" does not exist'。用真的 DB
  // 錯誤而不是自己 throw new Error('x')，因為真正要防的就是 DB／ORM 的
  // 內部訊息外洩，斷言裡明確要求那些字眼不出現在回應裡。
  //
  // 不能像原本那樣在測試裡後掛一條會炸的路由：createApp 已經先掛好
  // ROUTE_NOT_FOUND 的 fallback，後加的路由排在它後面永遠輪不到。
  //
  // 契約在 message 欄位上明寫：code 為 INTERNAL_ERROR 時一律是固定的通用
  // 字串，不會包含任何後端內部細節。
  it('回 500 與 INTERNAL_ERROR，且不洩漏內部細節', async () => {
    // 暫時把 Default 換成沒有套用 migration 的資料庫，用完換回來，
    // 免得後面的測試也拿到它。
    const emptyDb = new Kysely<Database>({
      dialect: new PGliteDialect(new PGlite()),
    })
    useDatabase(emptyDb)

    const res = await request(createApp()).get('/api/patients')

    useDatabase(db)

    expect(res.status).toBe(500)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'internal server error',
      data: {},
    })

    const serialised = JSON.stringify(res.body)
    expect(serialised).not.toContain('patients')
    expect(serialised).not.toContain('does not exist')

    await emptyDb.destroy()
  })
})

describe('body 超過大小上限', () => {
  // 計畫：
  // 1. config 新增 max_request_body，預設 "10MB"，用 bytes 解析成位元組
  //    數。bytes 是 express.json({ limit }) 內部本來就在用的解析器，
  //    KB/MB/GB 一律 1024 進位。
  // 2. createApp 從 config.Default 讀上限傳給 express.json({ limit })。
  //    這顆測試暫時換上一份上限很小的設定，才不用真的送 10MB。
  // 3. errorHandler 多認一種：express.json() 超過上限時丟的錯誤帶
  //    type: 'entity.too.large'，轉成
  //    ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body too large')。
  //
  // 現在這個錯誤不被 errorHandler 認得，會被遮成 500 INTERNAL_ERROR——
  // 呼叫端會以為伺服器壞了，其實是自己送太大。
  //
  // data 是空物件：後端根本沒讀 body 的內容，說不出是哪個欄位有問題。
  it('回 413 與 PAYLOAD_TOO_LARGE', async () => {
    useConfig({ ...testConfig, max_request_body: 1024 })
    const app = createApp()
    useConfig(testConfig)

    const res = await request(app)
      .post('/api/patients/1/orders')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ message: 'x'.repeat(2000) }))

    expect(res.status).toBe(413)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'request body too large',
      data: {},
    })
  })
})
