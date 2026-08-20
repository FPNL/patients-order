import express, { type Express } from 'express'
import type { Kysely } from 'kysely'
import { ApiError, errorHandler } from './api/api'
import {
  createOrderForPatient,
  listOrdersOfPatient,
  replaceOrder,
} from './api/order'
import { listPatients } from './api/patient'
import type { Database } from './db/schema'

/**
 * 回傳一個尚未 listen 的 Express app，讓 supertest 可以直接掛上去，
 * 測試不必真的開 port。
 *
 * 路徑集中在這裡，與 docs/openapi.yaml 的端點一一對應；handler 本身住在
 * api/ 底下、以契約的 operationId 命名。
 */
export function createApp(db: Kysely<Database>): Express {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/patients', listPatients(db))
  app.get('/api/patients/:patientId/orders', listOrdersOfPatient(db))
  app.post('/api/patients/:patientId/orders', createOrderForPatient(db))
  app.put('/api/orders/:orderId', replaceOrder(db))

  // 放在所有路由之後才不會攔掉正常請求，放在 errorHandler 之前才丟得進去。
  // 沒有這條的話 Express 會吐預設的 HTML 錯誤頁，契約承諾的「所有錯誤回應
  // 都是同一個形狀」就不成立。
  app.use(() => {
    throw new ApiError(404, 'ROUTE_NOT_FOUND', 'route not found')
  })

  app.use(errorHandler)

  return app
}
