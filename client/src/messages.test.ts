import { describe, expect, it } from 'vitest'
import { messageFor } from './messages'

describe('messageFor', () => {
  // 契約的 code 值域是封閉的，每一個都要有對應的中文，不能掉到 default
  // 去顯示「儲存失敗」這種看不出原因的話。
  it.each([
    ['VALIDATION_FAILED', '醫囑內容不能是空白'],
    ['NOT_FOUND', '這筆資料已經不存在，請重新整理'],
    ['PAYLOAD_TOO_LARGE', '醫囑內容太長，請縮短後再試'],
    ['UNEXPECTED_RESPONSE', '無法連上伺服器，請稍後再試'],
  ])('%s 對應到專屬的說明', (code, expected) => {
    expect(messageFor(code)).toBe(expected)
  })

  // 契約明寫呼叫端遇到未列出的 code 必須當成未預期的錯誤處理、不得因此
  // 中斷，所以這裡要回一句話而不是丟例外或回 undefined。
  it.each(['ROUTE_NOT_FOUND', 'INTERNAL_ERROR', '未來才會有的 code'])(
    '%s 落到通用說明而不是壞掉',
    (code) => {
      expect(messageFor(code)).toBe('儲存失敗，請稍後再試')
    },
  )
})
