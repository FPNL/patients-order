import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Kysely } from 'kysely'
import { createApp } from '../app'
import { createTestDatabase } from '../db/test-database'
import type { Database } from '../db/schema'

// 這些測試都不關心 body 上限，用一個寬鬆到碰不到的值。
// 上限本身的行為由 api.test.ts 裡那顆 413 的測試負責。
const appOptions = { maxRequestBody: 1024 * 1024 }

let db: Kysely<Database>

// PGlite 實例建立一次約 500ms，所以每個測試檔只建一次。這個檔案目前沒有
// 任何測試會寫資料，所以還不需要測試之間的隔離手段。
beforeAll(async () => {
  db = await createTestDatabase()
})
afterAll(async () => {
  await db.destroy()
})

describe('GET /api/patients', () => {
  it('回 200，body 是 JSON 陣列', async () => {
    const res = await request(createApp(db, appOptions)).get('/api/patients')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(Array.isArray(res.body)).toBe(true)
  })

  // 計畫：
  // 1. 新增 migration 建 patients 表（id integer primary key、name text
  //    not null），並在同一份 migration 裡 insert 這 5 筆固定住民。
  //    id 不用 serial——住民是固定資料，不會再新增。
  // 2. schema.ts 的 Database interface 加上 patients 這張表的型別。
  // 3. createApp 改成收 db，handler 改成
  //    db.selectFrom('patients').select(['id','name']).orderBy('id').execute()。
  //
  // 依 id 由小到大是契約要補上的承諾（目前契約沒寫住民清單的順序），
  // 補上之後這裡才能斷言完整的陣列而不只是集合。
  it('回傳 5 位固定住民，依 id 由小到大', async () => {
    const res = await request(createApp(db, appOptions)).get('/api/patients')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { id: 1, name: '小民' },
      { id: 2, name: '阿珠' },
      { id: 3, name: '志明' },
      { id: 4, name: '春嬌' },
      { id: 5, name: '阿英' },
    ])
  })
})
