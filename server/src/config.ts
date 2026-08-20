import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import bytes from 'bytes'
import ms from 'ms'
import { z } from 'zod'

/**
 * 人類可讀的大小，例如 "10MB"。KB／MB／GB 一律 1024 進位，大小寫不敏感。
 * 解析成位元組數。fallback 是欄位未設定時採用的字面值。
 *
 * 用 bytes 而不是自己寫：Node 沒有官方的大小解析 API，而 bytes 正是
 * express.json({ limit }) 內部在用的那一支，行為與 Express 一致。
 */
const byteSize = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value, ctx) => {
      const parsed = bytes.parse(value)
      if (parsed === null || Number.isNaN(parsed)) {
        ctx.addIssue({ code: 'custom', message: `not a valid size: ${value}` })
        return z.NEVER
      }
      return parsed
    })

/**
 * 人類可讀的時間長度，例如 "10s"、"2m"。解析成毫秒。
 *
 * 同樣沒有官方 API，用生態系的事實標準 ms。
 */
const duration = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value, ctx) => {
      const parsed = ms(value as ms.StringValue)
      if (typeof parsed !== 'number' || Number.isNaN(parsed)) {
        ctx.addIssue({ code: 'custom', message: `not a valid duration: ${value}` })
        return z.NEVER
      }
      return parsed
    })

/**
 * 設定檔的結構。新增欄位時這裡是唯一的真相來源——schema 推導出 Config
 * 型別，不另外手寫一份 interface。
 */
const configSchema = z
  .object({
    /** HTTP 服務要監聽的埠號。 */
    port: z.number().int().min(1).max(65535).default(3001),

    database: z
      .object({
        /** PostgreSQL 連線字串，例如 postgresql://user:pass@host:5432/db。 */
        url: z.string().min(1),
      })
      .strict(),

    /**
     * 單一 request body 的大小上限，避免超大 body 耗盡記憶體。
     * 超過的請求直接回 413。
     */
    max_request_body: byteSize('10MB'),

    /**
     * 收到 SIGTERM／SIGINT 後，等待既有請求做完的最長時間。
     * 超過就強制關閉還開著的連線。
     */
    shutdown_timeout: duration('10s'),
  })
  .strict()

export type Config = z.infer<typeof configSchema>

/** 設定檔的內容不合規格時丟出的錯誤，訊息會直接印給啟動者看。 */
export class ConfigError extends Error {}

/**
 * 解析設定檔內容。與檔案系統無關，方便測試。
 *
 * 未定義的欄位會讓整份設定被拒絕而不是默默忽略——設定檔打錯字時應該
 * 馬上知道，而不是帶著一個沒生效的值上線。
 */
export function parseConfig(source: string, path: string): Config {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch (err) {
    throw new ConfigError(`${path} is not valid JSON: ${(err as Error).message}`)
  }

  const parsed = configSchema.safeParse(raw)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new ConfigError(`${path} is not a valid config:\n${details}`)
  }

  return parsed.data
}

/** 從命令列取得 --conf 指定的路徑，讀檔後解析。 */
export function loadConfig(argv: string[]): Config {
  const { values } = parseArgs({
    args: argv,
    options: { conf: { type: 'string' } },
    strict: true,
  })

  if (!values.conf) {
    throw new ConfigError('missing required option --conf <path to config file>')
  }

  let source: string
  try {
    source = readFileSync(values.conf, 'utf8')
  } catch (err) {
    throw new ConfigError(`cannot read ${values.conf}: ${(err as Error).message}`)
  }

  return parseConfig(source, values.conf)
}
