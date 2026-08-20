import { describe, expect, it } from 'vitest'
import { sql } from 'kysely'
import { createTestDatabase } from './test-database'

describe('測試資料庫骨架', () => {
  it('PGlite 起得來，而且是真的 Postgres 方言', async () => {
    const db = await createTestDatabase()

    // gen_random_uuid() 是 Postgres 專屬函式，SQLite 上不存在。
    // 這顆測試存在的意義就是釘住「測試環境與正式環境同方言」。
    const result = await sql<{ id: string }>`select gen_random_uuid() as id`.execute(db)

    expect(result.rows[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    await db.destroy()
  })

  it('每次呼叫都是互相隔離的全新實例', async () => {
    const a = await createTestDatabase()
    const b = await createTestDatabase()

    await sql`create table probe (v int)`.execute(a)
    await sql`insert into probe (v) values (1)`.execute(a)

    const inA = await sql<{ v: number }>`select v from probe`.execute(a)
    expect(inA.rows).toEqual([{ v: 1 }])

    // b 看不到 a 建的表，代表兩者不共用 storage。
    await expect(sql`select v from probe`.execute(b)).rejects.toThrow()

    await a.destroy()
    await b.destroy()
  })
})
