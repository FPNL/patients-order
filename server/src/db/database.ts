import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './schema'

/**
 * 目前生效的資料庫連線。`createDatabase()` 之前是 undefined——啟動流程
 * 必須先呼叫它。
 *
 * ESM 的 export binding 對匯入方是唯讀的，所以測試要換成 PGlite 得經由
 * {@link useDatabase}，不能直接指派。
 */
export let Default: Kysely<Database>

/** 連上正式與開發環境用的 PostgreSQL，並設為 {@link Default}。 */
export function createDatabase(connectionString: string): void {
  Default = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString }),
    }),
  })
}

/** 讓測試注入自己的資料庫（PGlite），不必連真的 PostgreSQL。 */
export function useDatabase(db: Kysely<Database>): void {
  Default = db
}
