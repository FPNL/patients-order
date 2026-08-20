import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { sql, type Kysely } from 'kysely'
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

// 從新增醫囑那顆開始這個檔案有寫入，測試之間必須隔離。PGlite 建立一次要
// 約 500ms，所以不重建實例，改用 transaction rollback——單顆成本 0.33ms。
beforeEach(async () => {
  await sql`begin`.execute(db)
})
afterEach(async () => {
  await sql`rollback`.execute(db)
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

  // 計畫：
  // 1. 在這條 handler 開頭用 zod 驗路徑參數：
  //    z.object({ patientId: z.coerce.number().int().positive() })。
  //    路徑參數永遠是字串，所以要 coerce。
  // 2. 驗不過就丟 ApiError(400, 'VALIDATION_FAILED', 'invalid path
  //    parameter', z.flattenError(err).fieldErrors)——data 的形狀契約已經
  //    定死是 { 欄位名: [訊息, ...] }，正好是 fieldErrors。
  // 3. 驗過才拿去查住民，所以 abc 會在查資料庫之前就被擋下來，回 400
  //    而不是 404。這正是契約在 PatientId 參數上明寫的行為。
  //
  // data 裡的訊息是 zod 產生的，照 CLAUDE.md 不准用猜的：實際跑過
  // zod 4.4.3 得到 'Invalid input: expected number, received NaN'，
  // 原樣寫進斷言。
  it('住民 id 不是整數時回 400 與 VALIDATION_FAILED', async () => {
    const res = await request(createApp(db)).get('/api/patients/abc/orders')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'invalid path parameter',
      data: {
        patientId: ['Invalid input: expected number, received NaN'],
      },
    })
  })
})

describe('POST /api/patients/:patientId/orders', () => {
  // 計畫：
  // 1. 新增 migration 建 orders 表：id serial primary key、
  //    patient_id integer not null references patients(id)、
  //    message text not null。排序用的時間欄位這顆不加，等第 10 顆。
  // 2. schema.ts 的 Database interface 加上 orders。id 用
  //    Generated<number>，因為 insert 時不給、由資料庫產生。
  // 3. createApp 加一條 app.post，沿用同一份路徑參數驗證與住民存在性
  //    檢查，body 用 z.object({ message: z.string().min(1).max(4000) })
  //    驗過之後 insertInto('orders').returningAll()，回 201。
  //
  // 驗證失敗、未定義欄位、住民不存在這三條分支都不碰，各自留給第 7、8、
  // 9 顆。這顆只走 happy path。
  //
  // 斷言完整的 body：契約規定回的是 Order，三個欄位都要在。id 由後端
  // 產生且契約明寫不承諾連續，但這是一個乾淨的測試資料庫、序列從 1 開始，
  // 所以這裡斷言 1 是安全的。
  it('新增成功時回 201 與建立的醫囑', async () => {
    const res = await request(createApp(db))
      .post('/api/patients/1/orders')
      .send({ message: '超過120請施打8u' })

    expect(res.status).toBe(201)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual({
      id: 1,
      patientId: 1,
      message: '超過120請施打8u',
    })
  })

  // 計畫：把 orderInput.parse 換成 safeParse，驗不過就丟
  // ApiError(400, 'VALIDATION_FAILED', 'invalid request body',
  // z.flattenError(err).fieldErrors)——與路徑參數那條同一個模式，
  // 只有 message 欄位不同（'invalid request body' vs
  // 'invalid path parameter'）。
  //
  // 現在 parse 丟出的 ZodError 會被 error middleware 的 next(err) 交還
  // Express，回的是 500。這顆要把它變成契約規定的 400。
  //
  // data 裡的訊息是實際跑 zod 4.4.3 取得的：空字串得到
  // 'Too small: expected string to have >=1 characters'。同時也跑了缺欄位
  // 與超長兩種，但沒有測試要求，不寫進斷言。
  it('醫囑內容為空字串時回 400 與 VALIDATION_FAILED', async () => {
    const res = await request(createApp(db))
      .post('/api/patients/1/orders')
      .send({ message: '' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'invalid request body',
      data: {
        message: ['Too small: expected string to have >=1 characters'],
      },
    })
  })

  // 計畫：
  // 1. orderInput 加上 .strict()，未知欄位就會產生一個 unrecognized_keys
  //    的 issue。
  // 2. 但 z.flattenError().fieldErrors 拿不到它——那個 issue 的 path 是
  //    空陣列，所以會被歸到 formErrors，data 會變成空物件、資訊整個掉。
  //    所以要改成自己走 error.issues 組 data：有 path 的用 path[0] 當鍵，
  //    unrecognized_keys 則把 issue.keys 裡的每個欄位名都當成一個鍵。
  //    這也順便取代目前兩處的 flattenError 呼叫。
  //
  // 訊息實際跑過 zod 4.4.3：一個未知欄位得到單數的
  // 'Unrecognized key: "Message"'，兩個以上會變成複數並列在同一句。
  // 這顆只送一個未知欄位，所以斷言單數形。
  it('帶了未定義的欄位時回 400 與 VALIDATION_FAILED', async () => {
    const res = await request(createApp(db))
      .post('/api/patients/1/orders')
      .send({ message: '超過120請施打8u', Message: '拼錯的欄位名' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'invalid request body',
      data: {
        Message: ['Unrecognized key: "Message"'],
      },
    })
  })

  it('住民不存在時回 404 與 NOT_FOUND', async () => {
    const res = await request(createApp(db))
      .post('/api/patients/99/orders')
      .send({ message: '超過120請施打8u' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: 'patient not found',
      data: {},
    })
  })
})
