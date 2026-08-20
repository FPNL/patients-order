import { describe, expect, it } from 'vitest'
import { CliError, parseCliArgs } from './cli'

describe('parseCliArgs', () => {
  it('把 --conf 的值當成設定檔路徑回傳', () => {
    expect(parseCliArgs(['--conf', '/etc/app/config.json'])).toEqual({
      conf: '/etc/app/config.json',
    })
  })

  // 打算怎麼讓它變綠：在 cli.ts export 一個 `class CliError extends Error`，
  // 然後把回傳處的 `values.conf!` 換成判斷——undefined 就丟
  // `new CliError('missing required option --conf <path to config file>')`。
  //
  // 訊息是我們自己寫的字串，不是 library 產生的，所以直接寫死斷言；
  // main.test.ts:38 已經在用它的前綴當黑箱斷言，兩邊要對得起來。
  //
  // 用獨立的 CliError 而不是借 config.ts 的 ConfigError：那個型別代表
  // 「設定檔內容不合規格」，命令列用法錯誤不是同一件事。
  //
  // 這一輪不管不認得的選項——parseArgs 現在丟的還是 TypeError，那是下一顆。
  it('沒給 --conf 就丟 CliError', () => {
    expect(() => parseCliArgs([])).toThrow(
      new CliError('missing required option --conf <path to config file>'),
    )
  })

  // 打算怎麼讓它變綠：把 parseArgs 那段包進 try／catch。parseArgs 對不認得
  // 的選項丟的是帶 ERR_PARSE_ARGS_ 前綴 code 的 TypeError——那跟缺 --conf
  // 一樣是「命令列用法錯誤」，所以攔下來換成同訊息的 CliError 再丟出去，
  // 呼叫端只要認得 CliError 一種型別。
  //
  // 訊息是 parseArgs 產生的，不是猜的：先跑過
  // `parseArgs({ args: ['--typo', '1'], options: { conf: { type: 'string' } },
  // strict: true })`，拿到的就是這個字串。
  //
  // catch 到非 ERR_PARSE_ARGS_ 的錯誤要原樣 rethrow——那代表 parseArgs 的
  // 用法出錯（例如 options 寫錯），是程式的 bug，該留下堆疊追蹤。
  it('不認得的選項就丟 CliError', () => {
    expect(() => parseCliArgs(['--conf', '/c.json', '--typo', '1'])).toThrow(
      new CliError("Unknown option '--typo'"),
    )
  })
})
