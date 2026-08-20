import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { z } from 'zod'

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
