import { request } from './api'
import type { Patient } from './types'

/** 契約的 listPatients：全部住民，依 id 由小到大。 */
export function listPatients(): Promise<Patient[]> {
  return request<Patient[]>('/api/patients')
}
