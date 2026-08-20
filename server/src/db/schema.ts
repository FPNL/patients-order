import type { Generated } from 'kysely'

/** 住民。固定資料，本 API 不提供新增、修改或刪除。 */
export interface PatientTable {
  id: number
  name: string
}

/** 醫囑。可新增、可編輯，本 API 不提供刪除。 */
export interface OrderTable {
  /** insert 時不給，由資料庫產生。 */
  id: Generated<number>
  patient_id: number
  message: string
}

/**
 * Kysely 的資料表型別定義。每張表、每個欄位都由一顆要求它的紅燈測試
 * 逼出來，不預先設計。
 */
export interface Database {
  patients: PatientTable
  orders: OrderTable
}
