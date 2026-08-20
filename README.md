# 專案結構

```
├── client/          Vite + React + MUI
│   └── src/
│       └── test/    MSW 與 RTL 的測試環境設定
├── server/          Express + Kysely
│   └── src/
│       └── db/      dialect、migration、測試資料庫
├── docs/
│   └── openapi.yaml     API 契約（規格先行，實作跟著它走）
└── docker-compose.yml   開發用 PostgreSQL（測試用不到）
```

- **為什麼是 npm workspaces 而不是兩個獨立資料夾**：
  - 一次 `npm install`、一行 `npm run dev` 就能把整個專案跑起來，
    開發者不必開兩個終端機、讀兩段安裝步驟。
- 端開發時打 `/api/*`，由 Vite dev server proxy 轉給 Express，因此不需要處理 CORS。

---

# 開發方向

1. 不過度設計，不過度設計，不過度設計
2. TDD 開發
3. 根據以上兩點以及此專案目的，必須採取最簡開發

---

# 技術選型與取捨

## 前端

| 項目 | 選用 | 版本 |
|---|---|---|
| 框架 | React（function component + hooks） | 19.2 |
| 建置工具 | Vite | 8.2 |
| 元件庫 | MUI | 9.3 |
| 狀態管理 | 自訂 hooks + `fetch` | — |
| 測試 | React Testing Library + user-event + MSW | 16.3 / 14.6 / 2.15 |

### 為什麼不是?

- **為什麼不是 create-react-app**：
  - Vite 的 dev server 冷啟動與 HMR 也明顯更快，對「一次一顆紅燈」的循環很有感。 
  - CRA 已於 2025 年 2 月由 React 官方正式宣告
    sunset，官方文件現在直接建議改用 Vite 等工具。
- **為什麼不用 Next.js**：
  - 整個應用是一頁 list 加一個 dialog，沒有 SSR、路由或 SEO 需求。
  引入 Next.js 只會增加建置複雜度與審閱成本。 
- **為什麼狀態管理不是 Redux Toolkit 或 TanStack Query**：
  - Redux Toolkit, TanStack Query 在實務上是更好的選擇，不過這需求真的不需要
  - 已經知道整體專案樣貌，並且配合開發方向，拿出適合的方案，而不是炫技，
   自訂 hooks 自然是成本最低的方案 
- **為什麼不是 mock `fetch`**：
  - MSW 攔在網路層，component 用的仍是真的 `fetch`。
  若改用 `vi.stubGlobal('fetch', ...)`，每顆測試都要手刻 `Response` 物件，而且會誘使人
  「為了好 mock」提早抽出一層 API client 介面——讓可測性反過來決定架構。

## 後端

| 項目 | 選用 | 版本 |
|---|---|---|
| 框架 | Express | 5.2 |
| 資料存取 | Kysely（type-safe query builder） | 0.29 |
| 正式資料庫 | PostgreSQL（`pg` driver） | 18 / 8.23 |
| 測試資料庫 | PGlite（Postgres 編譯成 WASM，跑在行程內） | 0.5 |
| 輸入驗證 | Zod | 4.4 |
| 測試 | Supertest | 7.2 |

`createApp()` 回傳尚未 `listen` 的 Express app，讓 Supertest 直接掛上去，測試不必真的開 port。

### 為什麼不是?

- **為什麼不用 ORM**： 
  - 這個應用只有兩張表、一組 CRUD。ORM 帶來的 entity 生命週期、relation loading、
  migration 工具鏈，成本大於收益。Kysely 是 query builder 不是 ORM：型別從 schema 推導，
  寫的仍是看得懂的 SQL
- **為什麼測試資料庫不是 SQLite 或 docker 容器**： 
  - Kysely 的 migration DDL 是字串直傳（'serial'、'timestamptz'），SQLite 不認。
    用 SQLite 就得把欄位型別限制在 PG/SQLite 的交集，或在 migration 裡分支。
  - sqlite 單顆測試成本(~1ms) 對比 PGlite(~500ms) 相較低，平行測試攤提後就被吸收了
  - PGlite 提供跟 sqlite 一模一樣的手感，而且那是真的 Postgres。
  - 不選 容器 / testcontainers：一次一顆紅燈的循環會跑非常多次，
    容器啟停或外部依賴會直接拖慢節奏；而且審閱者要多一個前置步驟才跑得了測試。
- **為什麼不用社群 pglite dialect：**
  - 社群上有 `kysely-pglite` 與 `kysely-pglite-dialect`，兩個都有問題：
    - `kysely-pglite@0.6.1` 會連帶裝進 `kysely@0.27.6`，該版本帶有三個未修補的
      SQL injection 公告（`npm audit` 報 3 個 high）。
    - `kysely-pglite-dialect` 的 PGlite peer 上限停在 `^0.4.0`，裝不上 0.5。
  - Kysely 的 dialect 是文件化的擴充點，自己寫約 50 行
  （`server/src/db/pglite-dialect.ts`）：沿用 Postgres 的 adapter、query compiler 與
  introspector，只換掉負責執行的 driver。**SQL 的產生方式與正式環境完全相同**，
  換掉的只有把 SQL 送進哪個引擎。移除社群套件後 `npm audit` 為 0 vulnerabilities。

---

# 題目需求（原始）

<details>
<summary>展開</summary>

### 項目內容

請做一個簡單的 List 呈現 Patients，並於點擊後跳出 Dialog 呈現該 Patient 的
Order(醫囑)，於 Dialog 右上增加可新增 Order 按鈕，並提供編輯回存功能。

### 資料格式

5 位 patients，(請隨意設置) patients:

```json
[{
  "Id": "1",
  "Name": "小民",
  "OrderId": 1
}]
```

可編輯的醫囑 orders:

```json
[{
  "Id": 1,
  "Message": "超過120請施打8u"
}]
```

### 內容要求

1. 前端 React，使用 react hooks (state) 進行資料保存
2. 前端 React 資料的存取，採用 react hook 或 redux 均可，不限制
3. 前端採用 MaterialUI (https://material-ui.com) 為基礎元件，進行製作
4. 後端採用 Nodejs + Express 或 .NET
5. 後端資料庫採用 MongoDB 或 PostgreSQL
6. 住民為固定，醫囑可新增編輯

### 參考資料

- 前端可使用這個開始 https://github.com/facebook/create-react-app
- 呈上，若有找到前後整合的方案，不使用 create-react-app 無妨

</details>
