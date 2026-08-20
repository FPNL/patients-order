# 項目內容

請做一個簡單的 List 呈現 Patients，並於點擊後跳出 Dialog 呈現該 Patient 的 
Order(醫囑)，於 Dialog 右上增加可新增 Order 按鈕，並提供編輯回存功能。

# 資料格式
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


# 內容要求
1. 前端 React，使用 react hooks (state) 進行資料保存
2. 前端 React 資料的存取，採用 react hook 或 redux 均可，不限制
3. 前端採用 MaterialUI (https://material-ui.com) 為基礎元件，進行製作
4. 後端採用 Nodejs + Express 或 .NET
5. 後端資料庫採用 MongoDB 或 PostgreSQL
6. 住民為固定，醫囑可新增編輯

# 參考資料
- 前端可使用這個開始https://github.com/facebook/create-react-app
- 呈上，若有找到前後整合的方案，不使用 create-react-app 無妨
