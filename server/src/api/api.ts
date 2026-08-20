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

/** 驗路徑參數，不合規格就以契約的 VALIDATION_FAILED 拒絕整個請求。 */
export function parsePathParams<T extends z.ZodType>(
  schema: T,
  params: unknown,
): z.infer<T> {
  return parseOrThrow(schema, params, 'invalid path parameter')
}

/** 驗 request body，不合規格就以契約的 VALIDATION_FAILED 拒絕整個請求。 */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  return parseOrThrow(schema, body, 'invalid request body')
}

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  input: unknown,
  message: string,
): z.infer<T> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_FAILED', message, toFieldErrors(parsed.error))
  }
  return parsed.data
}

function isPayloadTooLargeError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err as Error & { type?: string }).type === 'entity.too.large'
  )
}

function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    (err as SyntaxError & { type?: string }).type === 'entity.parse.failed'
  )
}

/**
 * 把 ApiError 序列化成契約規定的 { code, message, data }。
 *
 * Express 5 會把 async handler 回傳的 rejected promise 轉到這裡，所以
 * handler 不需要各自包 try/catch。
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // express.json() 解析失敗時丟的是帶 type: 'entity.parse.failed' 的
  // SyntaxError。用 type 而不是 instanceof SyntaxError 判別：SyntaxError
  // 是 JS 內建型別，任何地方的語法錯誤都是它，範圍太寬。
  //
  // 不把 err.message 透出去——那是 Node JSON 解析器的內部細節
  // （'Expected property name or ... at position 2'）。契約規定 message
  // 由我們決定，所以與 zod 驗證失敗時用同一個字串。
  if (isJsonParseError(err)) {
    err = new ApiError(400, 'VALIDATION_FAILED', 'invalid request body')
  }

  // express.json() 在讀取階段就中止，body 的內容從沒被解析過，所以 data
  // 是空物件——後端說不出是哪個欄位有問題。
  if (isPayloadTooLargeError(err)) {
    err = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'request body too large')
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      data: err.data,
    })
    return
  }

  // 不認得的錯誤一律遮成通用訊息：這裡最可能是 DB／ORM 的錯誤，原始訊息
  // 會帶著資料表名稱之類的內部細節。細節去紀錄檔，不進回應——契約在
  // message 欄位上就是這樣承諾的。
  //
  // 只遮這個分支：所有刻意丟出的 ApiError（含未來可能的 5xx）在上面就已
  // 經回傳了，message 原樣保留。
  console.error('unexpected error', err)

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'internal server error',
    data: {},
  })
}
