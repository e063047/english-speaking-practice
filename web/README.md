# 英文口說練習網頁

## 如何使用
直接用瀏覽器打開 `index.html` 即可（電腦、iPhone、iPad 皆可，Safari/Chrome 都支援）。
把整個 `web` 資料夾複製到 iPhone/iPad 上（例如透過 AirDrop 或 iCloud 雲端硬碟），
再用 Safari 開啟裡面的 `index.html`。

## 題庫更新方式
1. 更新 `app_data` 裡的 Excel 檔案。
2. 在終端機執行：
   ```bash
   cd web/tools
   python3 convert_excel.py
   ```
3. 重新整理網頁即可看到最新題目（需要事先 `pip3 install openpyxl`）。

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
