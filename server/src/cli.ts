import { parseArgs } from 'node:util'

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

  return { conf: values.conf! }
}
