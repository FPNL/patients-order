import { parseArgs } from 'node:util'

/** 命令列用法錯誤時丟出的錯誤，訊息會直接印給啟動者看。 */
export class CliError extends Error {}

/**
 * parseArgs 對不認得的選項、缺值的選項等等丟的是帶 ERR_PARSE_ARGS_ 前綴
 * code 的 TypeError。那些跟缺 --conf 一樣是命令列用法錯誤，不是程式出錯。
 */
function isCliUsageError(err: unknown): err is Error {
  return (
    err instanceof Error &&
    'code' in err &&
    typeof err.code === 'string' &&
    err.code.startsWith('ERR_PARSE_ARGS_')
  )
}

/** 啟動時從命令列取得的參數。 */
export interface CliArgs {
  /** 設定檔路徑，來自 `--conf`。 */
  conf: string
}

/**
 * 解析命令列參數。只把 argv 轉成啟動參數，不讀檔、不驗設定內容——那是
 * config.ts 的事。
 *
 * 用 node:util 的 parseArgs 而不是 commander／yargs：只有一個選項，官方
 * API 就夠了。
 */
export function parseCliArgs(argv: string[]): CliArgs {
  let conf: string | undefined
  try {
    conf = parseArgs({
      args: argv,
      options: { conf: { type: 'string' } },
      strict: true,
    }).values.conf
  } catch (err) {
    // 用法錯誤換成 CliError，訊息沿用 parseArgs 的。其餘原樣丟出去——那代表
    // 上面的 options 寫錯了，是程式的 bug，該留下堆疊追蹤。
    if (isCliUsageError(err)) {
      throw new CliError(err.message)
    }
    throw err
  }

  if (!conf) {
    throw new CliError('missing required option --conf <path to config file>')
  }

  return { conf }
}
