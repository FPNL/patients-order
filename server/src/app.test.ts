import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Kysely } from 'kysely'
import { createApp } from './app'
import { createTestDatabase } from './db/test-database'
import type { Database } from './db/schema'

// 這些測試都不關心 body 上限，用一個寬鬆到碰不到的值。
// 上限本身的行為由 api.test.ts 裡那顆 413 的測試負責。
const appOptions = { maxRequestBody: 1024 * 1024 }

let db: Kysely<Database>

beforeAll(async () => {
  db = await createTestDatabase()
})
afterAll(async () => {
  await db.destroy()
})

describe('server 測試骨架', () => {
  it('supertest 可以直接打未 listen 的 app', async () => {
    const res = await request(createApp(db, appOptions)).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('資安相關的回應標頭', () => {
  // 計畫：在 createApp 最前面掛 helmet()。
  //
  // 這兩個標頭是這支 API 真的用得到的：
  // - x-powered-by 洩漏後端框架，等於免費告訴攻擊者該找哪些 CVE。
  //   helmet 會移除它。
  // - x-content-type-options: nosniff 阻止瀏覽器忽略 Content-Type 自行
  //   猜測型別。醫囑內容是使用者可自由輸入的文字、後端原樣回傳（契約
  //   明寫不做轉義），沒有這個標頭時瀏覽器有可能把 JSON 回應當成 HTML
  //   解讀而執行裡面的內容。
  //
  // helmet 還會設 CSP、HSTS 等其他標頭，但那些對純 JSON API 沒有實際
  // 作用，所以不寫進斷言——測試只釘住真的有意義的行為。
  it('不洩漏後端框架，且禁止瀏覽器猜測型別', async () => {
    const res = await request(createApp(db, appOptions)).get('/api/health')

    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })
})
