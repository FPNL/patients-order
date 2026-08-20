import type { NextFunction, Request, Response } from 'express'
import type { z } from 'zod'

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

/**
 * 把 zod 的 issue 攤成契約規定的 data 形狀：`{ 欄位名: [訊息, ...] }`。
 *
 * 不能直接用 z.flattenError()：未知欄位產生的 unrecognized_keys issue
 * 的 path 是空陣列，會被歸到 formErrors，fieldErrors 裡拿不到，data 會
 * 變成空物件、資訊整個掉。這裡改成用 issue.keys 裡的每個欄位名當鍵。
 */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}

  const add = (field: string, message: string) => {
    ;(fieldErrors[field] ??= []).push(message)
  }

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) add(key, issue.message)
      continue
    }

    add(String(issue.path[0]), issue.message)
  }

  return fieldErrors
}

/**
 * 把 ApiError 序列化成契約規定的 { code, message, data }。
 *
 * Express 5 會把 async handler 回傳的 rejected promise 轉到這裡，所以
 * handler 不需要各自包 try/catch。不認得的錯誤原樣往下傳。
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      data: err.data,
    })
    return
  }

  next(err)
}
