import { parseArgs } from 'node:util'

/** 命令列用法錯誤時丟出的錯誤，訊息會直接印給啟動者看。 */
export class CliError extends Error {}

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
  const { values } = parseArgs({
    args: argv,
    options: { conf: { type: 'string' } },
    strict: true,
  })

  if (!values.conf) {
    throw new CliError('missing required option --conf <path to config file>')
  }

  return { conf: values.conf }
}
