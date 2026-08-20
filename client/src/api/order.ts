import { request, withJsonBody } from './api'
import type { Order } from './types'

/** 契約的 listOrdersOfPatient：該住民的醫囑，依建立時間由舊到新。 */
export function listOrdersOfPatient(patientId: number): Promise<Order[]> {
  return request<Order[]>(`/api/patients/${patientId}/orders`)
}

/** 契約的 createOrderForPatient：新增一筆醫囑，回傳建立好的那筆。 */
export function createOrderForPatient(patientId: number, message: string): Promise<Order> {
  return request<Order>(
    `/api/patients/${patientId}/orders`,
    withJsonBody('POST', { message }),
  )
}

/** 契約的 replaceOrder：覆寫醫囑內容，回傳改寫後的那筆。 */
export function replaceOrder(orderId: number, message: string): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}`, withJsonBody('PUT', { message }))
}
