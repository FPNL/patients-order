/** 契約的 Patient。 */
export interface Patient {
  id: number
  name: string
}

/** 契約的 Order。 */
export interface Order {
  id: number
  patientId: number
  message: string
}
