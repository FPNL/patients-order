import express, { type Express } from 'express'
import helmet from 'helmet'
import { ApiError, errorHandler } from './api/api'
import {
  createOrderForPatientHandler,
  listOrdersOfPatientHandler,
  replaceOrderHandler,
} from './api/order'
import { listPatientsHandler } from './api/patient'
import * as config from './config'
import * as database from './db/database'

/**
 * 回傳一個尚未 listen 的 Express app，讓 supertest 可以直接掛上去，
 * 測試不必真的開 port。
 *
 * 呼叫前 config 與 database 的 Default 都必須已經備妥。handler 仍然收
 * Kysely 當參數，方便測試注入；createApp 只是把 Default 交給它們。
 *
 * 路徑集中在這裡，與 docs/openapi.yaml 的端點一一對應；handler 本身住在
 * api/ 底下，以契約的 operationId 加上 Handler 後綴命名。
 */
export function createApp(): Express {
  const app = express()

  // 補充，因為是小型專題，所以沒有琢磨 ratelimit cors ip白名單 compress 日誌 可觀測性

  // 掛在最前面，讓每個回應都帶到——包含錯誤回應。
  app.use(helmet())
  app.use(express.json({ limit: config.Default.max_request_body }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/patients', listPatientsHandler(database.Default))
  app.get('/api/patients/:patientId/orders', listOrdersOfPatientHandler(database.Default))
  app.post('/api/patients/:patientId/orders', createOrderForPatientHandler(database.Default))
  app.put('/api/orders/:orderId', replaceOrderHandler(database.Default))

  // 放在所有路由之後才不會攔掉正常請求，放在 errorHandler 之前才丟得進去。
  // 沒有這條的話 Express 會吐預設的 HTML 錯誤頁，契約承諾的「所有錯誤回應
  // 都是同一個形狀」就不成立。
  app.use(() => {
    throw new ApiError(404, 'ROUTE_NOT_FOUND', 'route not found')
  })

  app.use(errorHandler)

  return app
}
