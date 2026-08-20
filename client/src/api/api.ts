/**
 * 後端回錯誤時丟出的例外。
 *
 * 契約承諾所有錯誤回應都是同一個形狀 `{ code, message, data }`，而且
 * `code` 是唯一適合拿來分支的欄位，所以這裡只留 `code` 與 `data`；
 * 回應裡的 `message` 是英文、寫給開發者與紀錄檔看的，契約明寫呼叫端
 * 不得直接顯示給使用者，因此不往上帶。
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly data: Record<string, unknown>,
  ) {
    super(`${status} ${code}`)
  }
}

/** 後端沒有照契約回應時（例如 proxy 掛掉吐 HTML）用的 code。 */
export const UNEXPECTED_RESPONSE = 'UNEXPECTED_RESPONSE'

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { code?: unknown; data?: unknown }
    if (typeof body.code !== 'string') {
      return new ApiError(res.status, UNEXPECTED_RESPONSE, {})
    }
    // 契約規定 data 必填，補預設是防後端沒照契約走，不是常態。
    return new ApiError(res.status, body.code, (body.data ?? {}) as Record<string, unknown>)
  } catch {
    // 契約說錯誤一律是 JSON，但反向代理或網路層可能插進非 JSON 的回應。
    // 那種情況不該讓呼叫端拿到一個看不懂的解析例外。
    return new ApiError(res.status, UNEXPECTED_RESPONSE, {})
  }
}

/** 打後端並回傳解析後的 JSON；非 2xx 一律轉成 {@link ApiError}。 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)

  if (!res.ok) {
    throw await parseError(res)
  }

  return (await res.json()) as T
}

/** 送 JSON body 的請求設定，集中在這裡才不會有人漏了 Content-Type。 */
export function withJsonBody(method: 'POST' | 'PUT', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
