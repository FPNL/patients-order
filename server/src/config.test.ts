import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as config from './config'
import { ConfigError, parseConfig, readConfig } from './config'

const minimal = { database: { url: 'postgresql://app:app@localhost:5432/interview' } }
const source = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ ...minimal, ...extra })

describe('parseConfig 的預設值', () => {
  it('未設定的欄位一律採用預設值', () => {
    expect(parseConfig(source(), '/c.json')).toEqual({
      port: 3001,
      database: { url: 'postgresql://app:app@localhost:5432/interview' },
      max_request_body: 10 * 1024 * 1024,
      shutdown_timeout: 10_000,
    })
  })

  it('有設定就用設定的值', () => {
    expect(
      parseConfig(
        source({ port: 8080, max_request_body: '2MB', shutdown_timeout: '30s' }),
        '/c.json',
      ),
    ).toEqual({
      port: 8080,
      database: { url: 'postgresql://app:app@localhost:5432/interview' },
      max_request_body: 2 * 1024 * 1024,
      shutdown_timeout: 30_000,
    })
  })
})

describe('大小與時間的解析', () => {
  // 釘住 1024 進位。改成 1000 進位的話這幾顆會紅——那種改動不會有任何
  // 端點行為看得出來，只會讓實際上限悄悄變小。
  it.each([
    ['1KB', 1024],
    ['1MB', 1024 * 1024],
    ['1GB', 1024 * 1024 * 1024],
    ['1.5MB', 1_572_864],
    ['10mb', 10 * 1024 * 1024],
    ['1024', 1024],
  ])('%s 解析成 %i 位元組', (input, expected) => {
    expect(parseConfig(source({ max_request_body: input }), '/c.json').max_request_body).toBe(
      expected,
    )
  })

  it.each([
    ['500ms', 500],
    ['10s', 10_000],
    ['2m', 120_000],
    ['1h', 3_600_000],
  ])('%s 解析成 %i 毫秒', (input, expected) => {
    expect(parseConfig(source({ shutdown_timeout: input }), '/c.json').shutdown_timeout).toBe(
      expected,
    )
  })
})

describe('parseConfig 拒絕不合規格的設定', () => {
  // 訊息實際跑過 zod 4.4.3 取得，不是猜的。每一則都帶著出問題的欄位路徑，
  // 因為啟動失敗時使用者只看得到這一行。
  it.each([
    ['未知欄位', source({ typo: 1 }), '(root): Unrecognized key: "typo"'],
    [
      'database 內的未知欄位',
      JSON.stringify({ database: { url: 'x', host: 'y' } }),
      'database: Unrecognized key: "host"',
    ],
    [
      '缺 database',
      JSON.stringify({ port: 3001 }),
      'database: Invalid input: expected object, received undefined',
    ],
    [
      'url 是空字串',
      JSON.stringify({ database: { url: '' } }),
      'database.url: Too small: expected string to have >=1 characters',
    ],
    ['port 不是整數', source({ port: 1.5 }), 'port: Invalid input: expected int, received number'],
    ['port 超出範圍', source({ port: 99999 }), 'port: Too big: expected number to be <=65535'],
    [
      '大小格式不認得',
      source({ max_request_body: '十MB' }),
      'max_request_body: not a valid size: 十MB',
    ],
    [
      '時間格式不認得',
      source({ shutdown_timeout: '十秒' }),
      'shutdown_timeout: not a valid duration: 十秒',
    ],
  ])('%s', (_label, src, detail) => {
    expect(() => parseConfig(src, '/c.json')).toThrow(ConfigError)
    expect(() => parseConfig(src, '/c.json')).toThrow('/c.json is not a valid config')
    expect(() => parseConfig(src, '/c.json')).toThrow(detail)
  })

  it('內容不是合法 JSON', () => {
    expect(() => parseConfig('{ 壞掉', '/c.json')).toThrow(ConfigError)
    expect(() => parseConfig('{ 壞掉', '/c.json')).toThrow('/c.json is not valid JSON')
  })
})

describe('readConfig 讀檔並設定 Default', () => {
  const writeTemp = (contents: string): string => {
    const path = join(mkdtempSync(join(tmpdir(), 'config-test-')), 'config.json')
    writeFileSync(path, contents)
    return path
  }

  it('讀完之後其他地方可以直接用 Default', () => {
    readConfig(writeTemp(source({ port: 4321 })))

    expect(config.Default.port).toBe(4321)
    expect(config.Default.max_request_body).toBe(10 * 1024 * 1024)
  })

  it('檔案讀不到時說明是哪個路徑，且不動 Default', () => {
    readConfig(writeTemp(source({ port: 4321 })))

    expect(() => readConfig('/no/such/file.json')).toThrow(ConfigError)
    expect(() => readConfig('/no/such/file.json')).toThrow('cannot read /no/such/file.json')
    expect(config.Default.port).toBe(4321)
  })

  it('內容不合規格時不動 Default', () => {
    readConfig(writeTemp(source({ port: 4321 })))

    expect(() => readConfig(writeTemp('{"typo":1}'))).toThrow(ConfigError)
    expect(config.Default.port).toBe(4321)
  })
})
