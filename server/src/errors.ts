/**
 * 會被序列化成契約中 Error 形狀的錯誤。
 *
 * `code` 是呼叫端唯一適合拿來分支的欄位；`message` 是寫給開發者與紀錄檔
 * 看的英文說明，契約明寫呼叫端不得依賴其文字做判斷。
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly data: Record<string, unknown> = {},
  ) {
    super(message)
  }
}
