import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { sql, type Kysely } from 'kysely'
import { createApp } from '../app'
import { useConfig } from '../config'
import { useDatabase } from '../db/database'
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

beforeAll(async () => {
  db = await createTestDatabase()
  useDatabase(db)
  useConfig(testConfig)
})
afterAll(async () => {
  await db.destroy()
})

// 這個檔案有寫入，測試之間必須隔離。PGlite 建立一次約 500ms，所以不重建
// 實例，改成每顆測試前清空 orders。
//
// 不用 BEGIN / ROLLBACK：那個做法依賴共用連線的 transaction 狀態，只要有
// 一次 ROLLBACK 沒生效，污染就會靜悄悄地跨測試流過去，症狀是隨機某一顆
// 因為多了不該有的資料而紅。truncate 不依賴任何狀態，每顆多花 0.38ms。
//
// 附帶好處：同一個 transaction 裡 now() 回的是 transaction 開始時間，
// 連續新增的幾筆會拿到完全相同的 created_at；改成 truncate 之後每筆的
// created_at 才會真的不同，排序那顆測的才是它宣稱的東西。
//
// patients 不能清——那是 migration 帶進來的固定 seed。
beforeEach(async () => {
  await sql`truncate orders restart identity cascade`.execute(db)
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
    const res = await request(createApp()).get('/api/patients/1/orders')

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
    const res = await request(createApp()).get('/api/patients/99/orders')

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
    const res = await request(createApp()).get('/api/patients/abc/orders')

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
  // 斷言完整的 body：契約規定回的是 Order，三個欄位都要在。id 不寫死——
  // 契約明寫不承諾連續，而且 Postgres 的 sequence 不受 transaction
  // rollback 影響，實際值取決於這個檔案先前跑過幾次成功的 insert。
  // 這裡只釘住「是個正整數」，確切的值由後端決定。
  it('新增成功時回 201 與建立的醫囑', async () => {
    const res = await request(createApp())
      .post('/api/patients/1/orders')
      .send({ message: '超過120請施打8u' })

    expect(res.status).toBe(201)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.body).toEqual({
      id: expect.any(Number),
      patientId: 1,
      message: '超過120請施打8u',
    })
    expect(res.body.id).toBeGreaterThan(0)
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
    const res = await request(createApp())
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

  // 計畫：把 ReqCreateOrderForPatient 的 message 改成
  // z.string().trim().min(1).max(4000)。trim 在 min 之前跑，所以只由空白
  // 組成的內容會先被削成空字串、再落在 too_small，接著走既有的 parseBody
  // 丟 ApiError(400, 'VALIDATION_FAILED', 'invalid request body',
  // { message: [...] })——不必為它多開一條分支。
  //
  // 現在 min(1) 看到的是未經處理的 '   '，長度 3、通過驗證，這筆只有空白
  // 的醫囑會被存進資料庫，在清單上呈現為一列空白。
  //
  // data 裡的訊息是實際跑 zod 4.4.3 取得的：trim 後的空字串得到
  // 'Too small: expected string to have >=1 characters'，與空字串那顆同一
  // 句——契約只承諾 code，這個字串是 zod 的產物，原樣寫進斷言。
  it('醫囑內容只有空白時回 400 與 VALIDATION_FAILED', async () => {
    const res = await request(createApp())
      .post('/api/patients/1/orders')
      .send({ message: '   ' })

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
    const res = await request(createApp())
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
    const res = await request(createApp())
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

describe('醫囑的順序', () => {
  // 計畫：
  // 1. 新增 migration 給 orders 加一欄
  //    created_at timestamptz not null default now()。契約不暴露這個值，
  //    它只是排序依據——「依建立時間由舊到新」是契約對呼叫端的承諾，
  //    承諾的是順序，不是欄位。
  // 2. GET 那條的查詢加上 .orderBy('created_at').orderBy('id')。
  //    第二個 orderBy 是必要的：同一個 transaction 裡 now() 回的是
  //    transaction 開始時間，三筆會拿到完全相同的 created_at，只靠它排
  //    順序不穩定。id 是遞增的 serial，拿來當決勝依據。
  //
  // 這顆同時是 GET 第一次回非空清單，所以也釘住了 Order 的完整形狀
  // （id / patientId / message 三個欄位、snake_case 轉 camelCase）。
  it('回傳多筆醫囑時依建立時間由舊到新', async () => {
    const app = createApp()

    // 不能寫死 id：Postgres 的 sequence 不受 transaction rollback 影響，
    // 前面幾顆測試消耗掉的 nextval 不會還回來。這正是契約寫「不承諾連續」
    // 的實際原因。改成拿新增時後端回的 id 來斷言。
    const created: number[] = []
    for (const message of ['第一筆', '第二筆', '第三筆']) {
      const res = await request(app).post('/api/patients/1/orders').send({ message })
      created.push(res.body.id)
    }

    const res = await request(app).get('/api/patients/1/orders')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { id: created[0], patientId: 1, message: '第一筆' },
      { id: created[1], patientId: 1, message: '第二筆' },
      { id: created[2], patientId: 1, message: '第三筆' },
    ])
  })
})

describe('PUT /api/orders/:orderId', () => {
  // 計畫：
  // 1. 加一組 orderIdParam（與 patientIdParam 同形狀，鍵名不同）。
  // 2. createApp 加一條 app.put('/api/orders/:orderId')：驗路徑參數、
  //    驗 body（沿用 orderInput）、updateTable('orders').set({ message })
  //    .where('id','=',orderId).returningAll()。
  // 3. 回 200 與改寫後的醫囑。
  //
  // 醫囑不存在的分支不碰，留給第 12 顆——executeTakeFirst 回 undefined
  // 時目前會炸，那是下一顆要處理的。
  //
  // 這顆也釘住契約的一條承諾：改寫內容不會動到 id 與 patientId。
  it('改寫成功時回 200 與改寫後的醫囑', async () => {
    const app = createApp()

    const created = await request(app)
      .post('/api/patients/1/orders')
      .send({ message: '超過120請施打8u' })

    const res = await request(app)
      .put(`/api/orders/${created.body.id}`)
      .send({ message: '超過150請施打10u' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: created.body.id,
      patientId: 1,
      message: '超過150請施打10u',
    })
  })

  // 計畫：把 executeTakeFirstOrThrow 換成 executeTakeFirst，回 undefined
  // 就丟 ApiError(404, 'NOT_FOUND', 'order not found')。
  //
  // 現在 executeTakeFirstOrThrow 丟出的是 Kysely 的 NoResultError，
  // 會被 error middleware 的 next(err) 交還 Express，回的是 500。
  //
  // message 是 'order not found' 而不是住民那條的 'patient not found'：
  // 契約規定同一個 code 在不同情境可以有不同的 message，這裡正好用上——
  // 呼叫端靠 code 分支，靠 message 知道是哪一種找不到。
  it('醫囑不存在時回 404 與 NOT_FOUND', async () => {
    const res = await request(createApp())
      .put('/api/orders/9999')
      .send({ message: '超過150請施打10u' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: 'order not found',
      data: {},
    })
  })

  it('醫囑內容為空字串時回 400 與 VALIDATION_FAILED', async () => {
    const app = createApp()

    const created = await request(app)
      .post('/api/patients/1/orders')
      .send({ message: '超過120請施打8u' })

    const res = await request(app)
      .put(`/api/orders/${created.body.id}`)
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

  // 計畫：把 ReqReplaceOrder 的 message 也改成
  // z.string().trim().min(1).max(4000)，與 ReqCreateOrderForPatient 那條
  // 同樣的寫法。兩支端點的 body 是兩份各自獨立的契約，所以是各自改各自
  // 的 schema，不把它們合併成同一個常數。
  //
  // 現在 ReqReplaceOrder 的 min(1) 看到的是未經處理的 '   '，長度 3、通過
  // 驗證，會把一筆有內容的醫囑覆寫成只有空白。
  //
  // 訊息與新增那兩顆同一句，都是 zod 4.4.3 對 trim 後空字串產生的
  // 'Too small: expected string to have >=1 characters'。
  it('醫囑內容只有空白時回 400 與 VALIDATION_FAILED', async () => {
    const app = createApp()

    const created = await request(app)
      .post('/api/patients/1/orders')
      .send({ message: '超過120請施打8u' })

    const res = await request(app)
      .put(`/api/orders/${created.body.id}`)
      .send({ message: '   ' })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'invalid request body',
      data: {
        message: ['Too small: expected string to have >=1 characters'],
      },
    })
  })
})
