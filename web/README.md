# 英文口說練習網頁

GitHub: https://github.com/e063047/english-speaking-practice

## 如何使用
`index.html` 是一個單一、自包含的檔案（樣式、程式碼、題庫資料都打包在裡面），**只需要傳這一個檔案**就能用，不用整個 `web` 資料夾都傳過去。

- **電腦**：直接雙擊 `index.html` 用瀏覽器打開。
- **iPhone / iPad**：把 `index.html` 這一個檔案 AirDrop 或用 iCloud 雲端硬碟傳過去，在「檔案」App 裡點它，用 Safari 開啟。

> 之前版本是拆成好幾個檔案（`style.css`、`app.js`、`js/`、`data/` 資料夾），在 iPhone 上用「檔案」App 開啟時，Safari 讀不到同資料夾裡的其他檔案，導致畫面空白、選單也是空的。改成單一檔案後就不會有這個問題了。

## 題庫更新方式
1. 更新 `app_data` 裡的 Excel 檔案。
2. 在終端機執行：
   ```bash
   cd web/tools
   python3 convert_excel.py
   python3 build_index.py
   ```
   （第一步把 Excel 轉成 `data/sentences.js`，第二步把最新的題庫和程式碼打包成單一的 `index.html`。需要事先 `pip3 install openpyxl`。）
3. 把新產生的 `index.html` 重新傳一次給 iPhone/iPad（取代舊檔案）即可看到最新題目。

若你只是改了 `app.js`、`style.css`、`web/js/quiz-logic.js` 或 `web/js/bank-store.js`（沒有動 Excel），只需要重跑 `python3 build_index.py` 即可，不用重跑 `convert_excel.py`。

**注意**：練習題庫的收藏清單是用每個句子的「編號」記住的。新增句子請一律加在 Excel 最後面，**不要**更改既有列的「編號」，否則原本收藏的句子會悄悄對應到錯誤的內容。

## 練習題庫收藏清單跨裝置搬移
收藏清單存在每台裝置各自的瀏覽器裡。要搬到另一台裝置：
1. 在原本的裝置上按「匯出練習題庫清單」，存下 `practice-bank.json`。
2. 把這個檔案傳到另一台裝置（AirDrop / 雲端硬碟皆可）。
3. 在另一台裝置的網頁上按「匯入練習題庫清單」選擇這個檔案。

## 開發測試
以下指令都從專案根目錄（repo root）依序執行即可。

- Python 轉換工具測試：`(cd web/tools && python3 -m unittest -v)`
- JS 邏輯測試（macOS 內建 `jsc`，無需安裝任何套件）：
  ```bash
  JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
  "$JSC" web/tests/test-helper.js web/js/quiz-logic.js web/tests/quiz-logic.test.js
  "$JSC" web/tests/test-helper.js web/js/bank-store.js web/tests/bank-store.test.js
  ```
