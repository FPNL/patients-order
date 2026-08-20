/** 住民。固定資料，本 API 不提供新增、修改或刪除。 */
export interface PatientTable {
  id: number
  name: string
}

/**
 * Kysely 的資料表型別定義。每張表、每個欄位都由一顆要求它的紅燈測試
 * 逼出來，不預先設計。
 */
export interface Database {
  patients: PatientTable
}
