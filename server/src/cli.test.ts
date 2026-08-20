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

  // 打算怎麼讓它變綠：不用改實作。--conf 缺值時 parseArgs 丟的是
  // ERR_PARSE_ARGS_INVALID_OPTION_VALUE，前綴符合，上一輪的 catch 已經會把
  // 它換成 CliError。
  //
  // 這顆釘的是「缺值」與「沒給」是兩種錯誤：--conf 後面沒接東西的人已經知道
  // 要用這個選項，該看到的是「值呢」，不是「請加上 --conf」。實作若哪天改成
  // 先檢查 values.conf 再處理 parseArgs 的錯誤，兩者就會被混成同一句話。
  //
  // 訊息一樣是實跑 parseArgs 拿到的字串。
  it('--conf 沒接值就丟 CliError，訊息與沒給 --conf 不同', () => {
    expect(() => parseCliArgs(['--conf'])).toThrow(
      new CliError("Option '--conf <value>' argument missing"),
    )
  })

  // 打算怎麼讓它變綠：不用改實作。options 沒開 multiple，parseArgs 對重複的
  // 選項就是後面蓋掉前面，不當成錯誤——這是 GNU 慣例，也是 Node 的預設。
  //
  // 釘它是因為「不報錯」是個選擇，不是必然：實作若哪天加上 multiple: true，
  // values.conf 會變成陣列，這顆會紅。屆時要嘛把重複視為錯誤、要嘛明確挑一
  // 個，不能悄悄變成拿到 ['/a.json', '/b.json']。
  it('--conf 給多次時取最後一個', () => {
    expect(parseCliArgs(['--conf', '/a.json', '--conf', '/b.json'])).toEqual({
      conf: '/b.json',
    })
  })
})
