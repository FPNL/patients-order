import { UNEXPECTED_RESPONSE } from './api/api'

/**
 * 依契約的 `code` 決定給使用者看什麼。
 *
 * 契約明寫回應裡的 `message` 是英文、寫給開發者與紀錄檔看的，呼叫端
 * **不得**直接顯示給使用者——要顯示什麼由呼叫端自行決定，這個函式就是
 * 那個決定。
 */
export function messageFor(code: string): string {
  switch (code) {
    case 'VALIDATION_FAILED':
      return '醫囑內容不能是空白'
    case 'NOT_FOUND':
      // 本 API 不提供刪除醫囑，但多人同時操作時仍可能走到這裡。
      return '這筆資料已經不存在，請重新整理'
    case 'PAYLOAD_TOO_LARGE':
      return '醫囑內容太長，請縮短後再試'
    case UNEXPECTED_RESPONSE:
      return '無法連上伺服器，請稍後再試'
    default:
      return '儲存失敗，請稍後再試'
  }
}
