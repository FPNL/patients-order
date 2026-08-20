import { sql, type Kysely } from 'kysely'

// 排序依據。契約承諾的是「依建立時間由舊到新」這個順序，不是這個欄位——
// 它不會出現在任何回應裡。
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('orders')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('orders').dropColumn('created_at').execute()
}
