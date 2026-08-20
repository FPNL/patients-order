import express, { type Express } from 'express'
import helmet from 'helmet'
import type { Kysely } from 'kysely'
import { ApiError, errorHandler } from './api/api'
import {
  createOrderForPatientHandler,
  listOrdersOfPatientHandler,
  replaceOrderHandler,
} from './api/order'
import { listPatientsHandler } from './api/patient'
import type { Database } from './db/schema'

/**
 * 回傳一個尚未 listen 的 Express app，讓 supertest 可以直接掛上去，
 * 測試不必真的開 port。
 *
 * 路徑集中在這裡，與 docs/openapi.yaml 的端點一一對應；handler 本身住在
 * api/ 底下，以契約的 operationId 加上 Handler 後綴命名。
 */
export interface AppOptions {
  /** 單一 request body 的大小上限，單位是位元組。超過的請求回 413。 */
  maxRequestBody: number
}

export function createApp(db: Kysely<Database>, options: AppOptions): Express {
  const app = express()

  // 掛在最前面，讓每個回應都帶到——包含錯誤回應。
  app.use(helmet())
  app.use(express.json({ limit: options.maxRequestBody }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/patients', listPatientsHandler(db))
  app.get('/api/patients/:patientId/orders', listOrdersOfPatientHandler(db))
  app.post('/api/patients/:patientId/orders', createOrderForPatientHandler(db))
  app.put('/api/orders/:orderId', replaceOrderHandler(db))

  // 放在所有路由之後才不會攔掉正常請求，放在 errorHandler 之前才丟得進去。
  // 沒有這條的話 Express 會吐預設的 HTML 錯誤頁，契約承諾的「所有錯誤回應
  // 都是同一個形狀」就不成立。
  app.use(() => {
    throw new ApiError(404, 'ROUTE_NOT_FOUND', 'route not found')
  })

  app.use(errorHandler)

  return app
}
