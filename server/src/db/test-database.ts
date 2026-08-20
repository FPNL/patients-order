import { PGlite } from '@electric-sql/pglite'
import { Kysely } from 'kysely'
import { migrateToLatest } from './migrator'
import { PGliteDialect } from './pglite-dialect'
import type { Database } from './schema'

/**
 * 給測試用的資料庫：真的 Postgres（編譯成 WASM），跑在測試行程內，
 * 不需要 docker、不佔 port，每次呼叫都是全新的記憶體實例。
 * 方言與正式環境完全一致，不存在 SQLite/PG 的落差；跑的 migration
 * 也是正式環境那一份。
 */
export async function createTestDatabase(): Promise<Kysely<Database>> {
  const db = new Kysely<Database>({
    dialect: new PGliteDialect(new PGlite()),
  })

  await migrateToLatest(db)
  return db
}
