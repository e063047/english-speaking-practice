# 英文口說練習網頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個零依賴、純前端的英文口說練習網頁，資料來自 `app_data` 裡的 Excel 題庫，可在電腦、iPhone、iPad 上直接開啟使用。

**Architecture:** 純靜態網頁（HTML + CSS + 原生 JS，無框架、無建置工具）。資料由一個 Python 轉換工具把 Excel 轉成 `web/data/sentences.js`（一個直接賦值全域變數的 JS 檔，避免 `file://` 開啟時的 fetch/CORS 限制）。出題邏輯與收藏清單邏輯拆成兩個純函式模組，方便獨立測試；`app.js` 負責串接 DOM、`localStorage`、`speechSynthesis`。

**Tech Stack:** 原生 HTML/CSS/JavaScript（ES5 相容語法，無 module/build step）、Python 3 + `openpyxl`（僅轉換工具用）、macOS 內建 `jsc`（JavaScriptCore CLI，用來跑純 JS 邏輯的自動化測試，零安裝）、Python 內建 `unittest`。

**Spec:** `docs/superpowers/specs/2026-09-14-english-speaking-practice-design.md`

## Global Constraints

- 不使用任何 npm 套件、CDN 函式庫、後端伺服器或建置工具（來自 spec「明確排除範圍」）。
- 不做自動偵測 Excel 更新；使用者更新 Excel 後手動重跑轉換工具。
- 不做語音辨識評分，只用 `speechSynthesis` 朗讀正確答案。
- 練習題庫收藏清單存 `localStorage`（key: `englishPractice.bank`），裝置間用匯出/匯入 JSON 檔同步，不做雲端同步。
- 所有可點擊按鈕最小高度 48px；用 `clamp()` 讓字體/按鈕依螢幕寬度縮放（來自 spec「響應式設計」）。
- 分類下拉選單固定包含兩個特殊值：`全部分類混合`、`我的練習題庫`，其餘為 Excel 中出現的分類名稱。
- 這個目錄目前不是 git 專案；Task 1 的第一步會執行 `git init`，之後每個任務結尾都要 commit。

---

## Task 1: 專案初始化 + Excel → JS 轉換工具

**Files:**
- Create: `web/tools/convert_excel.py`
- Create: `web/tools/test_convert_excel.py`
- Create: `.gitignore`

**Interfaces:**
- Produces（後續任務會用到）:
  - `web/data/sentences.js`（執行 `convert_excel.py` 後產生，內容為 `window.SENTENCES = [ {id, category, zh, en}, ... ];`）
  - Python 函式 `read_sentences(xlsx_path) -> list[dict]`，每個 dict 有 `id`(int), `category`(str), `zh`(str), `en`(str)
  - Python 函式 `write_js(sentences, output_path) -> None`

- [ ] **Step 1: 初始化 git 倉庫**

```bash
cd /Users/winnielee/Desktop/English
git init
```

- [ ] **Step 2: 建立 .gitignore**

`.gitignore`:
```
.DS_Store
__pycache__/
*.pyc
```

- [ ] **Step 3: 寫失敗的測試 `web/tools/test_convert_excel.py`**

```python
import json
import tempfile
import unittest
from pathlib import Path

import openpyxl

from convert_excel import read_sentences, write_js


class ReadSentencesTests(unittest.TestCase):
    def _make_workbook(self, rows):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "英文對話總表"
        ws.append(["編號", "分類", "中文句子", "英文句子", "練習狀態", "備註"])
        for row in rows:
            ws.append(row)
        tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        wb.save(tmp.name)
        return Path(tmp.name)

    def test_reads_basic_rows(self):
        path = self._make_workbook([
            [1, "情感表達", "我很開心。", "I am happy.", "未練習", None],
            [2, "工作", "會議幾點開始？", "What time does the meeting start?", "未練習", None],
        ])
        result = read_sentences(path)
        self.assertEqual(result, [
            {"id": 1, "category": "情感表達", "zh": "我很開心。", "en": "I am happy."},
            {"id": 2, "category": "工作", "zh": "會議幾點開始？", "en": "What time does the meeting start?"},
        ])

    def test_skips_rows_with_empty_id(self):
        path = self._make_workbook([
            [1, "情感表達", "我很開心。", "I am happy.", "未練習", None],
            [None, None, None, None, None, None],
        ])
        result = read_sentences(path)
        self.assertEqual(len(result), 1)


class WriteJsTests(unittest.TestCase):
    def test_writes_valid_js_assignment(self):
        sentences = [{"id": 1, "category": "情感表達", "zh": "我很開心。", "en": "I am happy."}]
        tmp = tempfile.NamedTemporaryFile(suffix=".js", delete=False)
        write_js(sentences, Path(tmp.name))
        content = Path(tmp.name).read_text(encoding="utf-8")
        self.assertTrue(content.startswith("window.SENTENCES = "))
        self.assertTrue(content.rstrip().endswith(";"))
        json_part = content.strip()[len("window.SENTENCES = "):-1]
        self.assertEqual(json.loads(json_part), sentences)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 4: 執行測試，確認失敗（因為 `convert_excel.py` 還不存在）**

Run: `cd /Users/winnielee/Desktop/English/web/tools && python3 -m unittest test_convert_excel -v`
Expected: `ModuleNotFoundError: No module named 'convert_excel'`

- [ ] **Step 5: 實作 `web/tools/convert_excel.py`**

```python
import json
import sys
from pathlib import Path

import openpyxl

SHEET_NAME = "英文對話總表"


def read_sentences(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb[SHEET_NAME] if SHEET_NAME in wb.sheetnames else wb[wb.sheetnames[0]]
    sentences = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        sentence_id = row[0]
        if sentence_id is None:
            continue
        sentences.append({
            "id": int(sentence_id),
            "category": row[1],
            "zh": row[2],
            "en": row[3],
        })
    return sentences


def write_js(sentences, output_path):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(sentences, ensure_ascii=False, indent=2)
    output_path.write_text(f"window.SENTENCES = {json_text};\n", encoding="utf-8")


def main():
    script_dir = Path(__file__).resolve().parent
    xlsx_path = script_dir.parent.parent / "app_data" / "1490句完整日常英文對話表.xlsx"
    output_path = script_dir.parent / "data" / "sentences.js"

    if not xlsx_path.exists():
        print(f"找不到 Excel 檔案: {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    sentences = read_sentences(xlsx_path)
    write_js(sentences, output_path)
    print(f"已轉換 {len(sentences)} 筆句子到 {output_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: 再次執行測試，確認通過**

Run: `cd /Users/winnielee/Desktop/English/web/tools && python3 -m unittest test_convert_excel -v`
Expected: `OK`（2 個測試都 PASS）

- [ ] **Step 7: Commit**

```bash
cd /Users/winnielee/Desktop/English
git add .gitignore web/tools/convert_excel.py web/tools/test_convert_excel.py
git commit -m "feat: add Excel to JS sentence converter with tests"
```

---

## Task 2: 出題邏輯純函式模組 (`quiz-logic.js`)

**Files:**
- Create: `web/js/quiz-logic.js`
- Create: `web/tests/test-helper.js`
- Create: `web/tests/quiz-logic.test.js`

**Interfaces:**
- Consumes: 無（純函式，接受純資料）
- Produces（供 Task 5 `app.js` 使用）:
  - `CATEGORY_ALL`（字串常數 `'全部分類混合'`）
  - `CATEGORY_BANK`（字串常數 `'我的練習題庫'`）
  - `getCategories(sentences) -> string[]`（依原始出現順序的不重複分類清單）
  - `filterSentences(sentences, category, bankIds) -> object[]`
  - `shuffle(array, randomFn) -> array`（新陣列，不修改原陣列；`randomFn` 預設 `Math.random`）
  - `createQuizQueue(sentences, mode, randomFn) -> { next(): object|null }`（`mode` 為 `'sequential'` 或 `'random'`）
  - `TestHelper`（`web/tests/test-helper.js` 匯出的全域物件，供之後任務的測試共用）：`assertEqual(actual, expected, message)`、`assertTrue(value, message)`、`summary()`

- [ ] **Step 1: 建立測試小工具 `web/tests/test-helper.js`**

```javascript
var TestHelper = (function () {
  var passed = 0;
  var failed = 0;

  function assertEqual(actual, expected, message) {
    var actualStr = JSON.stringify(actual);
    var expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) {
      passed++;
      print("PASS: " + message);
    } else {
      failed++;
      print("FAIL: " + message + " -- expected " + expectedStr + " but got " + actualStr);
    }
  }

  function assertTrue(value, message) {
    assertEqual(!!value, true, message);
  }

  function summary() {
    print("---");
    print(passed + " passed, " + failed + " failed");
    if (failed > 0) {
      throw new Error(failed + " test(s) failed");
    }
  }

  return { assertEqual: assertEqual, assertTrue: assertTrue, summary: summary };
})();
```

- [ ] **Step 2: 寫失敗的測試 `web/tests/quiz-logic.test.js`**

```javascript
(function () {
  var sentences = [
    { id: 1, category: "A", zh: "一", en: "One" },
    { id: 2, category: "A", zh: "二", en: "Two" },
    { id: 3, category: "B", zh: "三", en: "Three" }
  ];

  TestHelper.assertEqual(getCategories(sentences), ["A", "B"], "getCategories returns unique categories in first-seen order");

  TestHelper.assertEqual(
    filterSentences(sentences, "A", []).map(function (s) { return s.id; }),
    [1, 2],
    "filterSentences by category A"
  );

  TestHelper.assertEqual(filterSentences(sentences, CATEGORY_ALL, []).length, 3, "filterSentences CATEGORY_ALL returns all");

  TestHelper.assertEqual(
    filterSentences(sentences, CATEGORY_BANK, [2, 3]).map(function (s) { return s.id; }),
    [2, 3],
    "filterSentences CATEGORY_BANK filters by bankIds"
  );

  var calls = [0.9, 0.1];
  var fakeRandom = function () { return calls.shift(); };
  var shuffled = shuffle([1, 2, 3], fakeRandom);
  TestHelper.assertEqual(shuffled.length, 3, "shuffle preserves length");
  TestHelper.assertEqual(shuffled.slice().sort(), [1, 2, 3], "shuffle preserves all elements");

  var seqQueue = createQuizQueue(sentences, "sequential");
  var seqResults = [
    seqQueue.next().id,
    seqQueue.next().id,
    seqQueue.next().id,
    seqQueue.next().id
  ];
  TestHelper.assertEqual(seqResults, [1, 2, 3, 1], "sequential queue cycles in order and wraps to start");

  var randQueue = createQuizQueue(sentences, "random", Math.random);
  var seenIds = {};
  for (var i = 0; i < 3; i++) {
    var item = randQueue.next();
    seenIds[item.id] = (seenIds[item.id] || 0) + 1;
  }
  TestHelper.assertEqual(seenIds, { "1": 1, "2": 1, "3": 1 }, "random queue returns each sentence exactly once per full pass");

  TestHelper.summary();
})();
```

- [ ] **Step 3: 執行測試，確認失敗**

Run: `JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc; "$JSC" web/tests/test-helper.js web/js/quiz-logic.js web/tests/quiz-logic.test.js`
Expected: 拋出錯誤，因為 `web/js/quiz-logic.js` 還不存在（`jsc` 回報找不到檔案）

- [ ] **Step 4: 實作 `web/js/quiz-logic.js`**

```javascript
var CATEGORY_ALL = "全部分類混合";
var CATEGORY_BANK = "我的練習題庫";

function getCategories(sentences) {
  var seen = {};
  var result = [];
  for (var i = 0; i < sentences.length; i++) {
    var c = sentences[i].category;
    if (!seen[c]) {
      seen[c] = true;
      result.push(c);
    }
  }
  return result;
}

function filterSentences(sentences, category, bankIds) {
  if (category === CATEGORY_ALL) {
    return sentences.slice();
  }
  if (category === CATEGORY_BANK) {
    var idSet = {};
    for (var i = 0; i < bankIds.length; i++) {
      idSet[bankIds[i]] = true;
    }
    return sentences.filter(function (s) { return !!idSet[s.id]; });
  }
  return sentences.filter(function (s) { return s.category === category; });
}

function shuffle(array, randomFn) {
  randomFn = randomFn || Math.random;
  var result = array.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(randomFn() * (i + 1));
    var tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

function createQuizQueue(sentences, mode, randomFn) {
  var index = 0;
  var queue = [];

  function refillQueue() {
    queue = shuffle(sentences, randomFn);
  }

  return {
    next: function () {
      if (sentences.length === 0) {
        return null;
      }
      if (mode === "random") {
        if (queue.length === 0) {
          refillQueue();
        }
        return queue.shift();
      }
      var item = sentences[index % sentences.length];
      index++;
      return item;
    }
  };
}
```

- [ ] **Step 5: 再次執行測試，確認通過**

Run: `JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc; "$JSC" web/tests/test-helper.js web/js/quiz-logic.js web/tests/quiz-logic.test.js`
Expected: 最後一行印出 `0 failed`

- [ ] **Step 6: Commit**

```bash
cd /Users/winnielee/Desktop/English
git add web/js/quiz-logic.js web/tests/test-helper.js web/tests/quiz-logic.test.js
git commit -m "feat: add quiz ordering/filtering logic with jsc-based tests"
```

---

## Task 3: 練習題庫本地儲存模組 (`bank-store.js`)

**Files:**
- Create: `web/js/bank-store.js`
- Create: `web/tests/bank-store.test.js`

**Interfaces:**
- Consumes: 無框架依賴；任何實作 `getItem(key)` / `setItem(key, value)` 的物件都可當 `storage`（實際使用時傳入瀏覽器的 `localStorage`，測試時傳入假物件）
- Produces（供 Task 5 `app.js` 使用）:
  - `BANK_STORAGE_KEY`（字串常數 `'englishPractice.bank'`）
  - `loadBankIds(storage) -> number[]`
  - `saveBankIds(storage, ids) -> void`
  - `toggleBankId(storage, id) -> number[]`（回傳切換後的完整清單）
  - `exportBankToJson(storage) -> string`（JSON 字串，含 `exportedAt` 與 `ids`）
  - `importBankFromJson(storage, jsonText) -> { ok: boolean, ids?: number[], error?: string }`（merge 現有清單與匯入清單的聯集）

- [ ] **Step 1: 寫失敗的測試 `web/tests/bank-store.test.js`**

```javascript
(function () {
  function makeFakeStorage() {
    var store = {};
    return {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem: function (key, value) {
        store[key] = value;
      }
    };
  }

  var storage = makeFakeStorage();
  TestHelper.assertEqual(loadBankIds(storage), [], "loadBankIds returns empty array when nothing stored");

  var afterToggle = toggleBankId(storage, 5);
  TestHelper.assertEqual(afterToggle, [5], "toggleBankId adds id when not present");

  var afterToggle2 = toggleBankId(storage, 5);
  TestHelper.assertEqual(afterToggle2, [], "toggleBankId removes id when already present");

  toggleBankId(storage, 1);
  toggleBankId(storage, 2);
  var exported = JSON.parse(exportBankToJson(storage));
  TestHelper.assertEqual(exported.ids, [1, 2], "exportBankToJson exports current ids");
  TestHelper.assertTrue(typeof exported.exportedAt === "string", "exportBankToJson includes exportedAt timestamp");

  var storage2 = makeFakeStorage();
  toggleBankId(storage2, 9);
  var importResult = importBankFromJson(storage2, JSON.stringify({ ids: [1, 2, 9] }));
  TestHelper.assertTrue(importResult.ok, "importBankFromJson succeeds on valid json");
  TestHelper.assertEqual(loadBankIds(storage2), [9, 1, 2], "importBankFromJson merges ids as union, keeping existing first");

  var badImport = importBankFromJson(storage2, "not json");
  TestHelper.assertTrue(badImport.ok === false, "importBankFromJson fails gracefully on invalid json");

  TestHelper.summary();
})();
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc; "$JSC" web/tests/test-helper.js web/js/bank-store.js web/tests/bank-store.test.js`
Expected: 拋出錯誤，因為 `web/js/bank-store.js` 還不存在

- [ ] **Step 3: 實作 `web/js/bank-store.js`**

```javascript
var BANK_STORAGE_KEY = "englishPractice.bank";

function loadBankIds(storage) {
  var raw = storage.getItem(BANK_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveBankIds(storage, ids) {
  storage.setItem(BANK_STORAGE_KEY, JSON.stringify(ids));
}

function toggleBankId(storage, id) {
  var ids = loadBankIds(storage);
  var index = ids.indexOf(id);
  if (index === -1) {
    ids.push(id);
  } else {
    ids.splice(index, 1);
  }
  saveBankIds(storage, ids);
  return ids;
}

function exportBankToJson(storage) {
  var ids = loadBankIds(storage);
  return JSON.stringify({ exportedAt: new Date().toISOString(), ids: ids }, null, 2);
}

function importBankFromJson(storage, jsonText) {
  var parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, error: "檔案格式錯誤，無法解析" };
  }
  if (!parsed || !Array.isArray(parsed.ids)) {
    return { ok: false, error: "檔案內容格式不正確" };
  }
  var merged = loadBankIds(storage).slice();
  for (var i = 0; i < parsed.ids.length; i++) {
    if (merged.indexOf(parsed.ids[i]) === -1) {
      merged.push(parsed.ids[i]);
    }
  }
  saveBankIds(storage, merged);
  return { ok: true, ids: merged };
}
```

- [ ] **Step 4: 再次執行測試，確認通過**

Run: `JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc; "$JSC" web/tests/test-helper.js web/js/bank-store.js web/tests/bank-store.test.js`
Expected: 最後一行印出 `0 failed`

- [ ] **Step 5: Commit**

```bash
cd /Users/winnielee/Desktop/English
git add web/js/bank-store.js web/tests/bank-store.test.js
git commit -m "feat: add localStorage bank persistence with export/import merge"
```

---

## Task 4: 網頁靜態骨架與響應式樣式

**Files:**
- Create: `web/index.html`
- Create: `web/style.css`

**Interfaces:**
- Produces（供 Task 5 `app.js` 依賴的 DOM id，`app.js` 用這些 id 抓取元素）:
  - `#category-select`（`<select>`，分類下拉選單）
  - `#mode-select`（`<select>`，出題模式：`sequential` / `random`）
  - `#empty-message`（空題庫提示文字容器，預設隱藏）
  - `#quiz-card`（題目卡片容器）
  - `#zh-sentence`（中文句子文字）
  - `#en-cover`（黑色遮蓋色塊）
  - `#en-sentence`（英文句子文字，預設被 `#en-cover` 蓋住）
  - `#reveal-button`（「看結果」按鈕）
  - `#replay-audio-button`（喇叭重播按鈕，預設隱藏，看結果後顯示）
  - `#toggle-bank-button`（「加入/移除練習題庫」按鈕）
  - `#next-button`（「下一題」按鈕）
  - `#export-bank-button`（「匯出清單」按鈕）
  - `#import-bank-input`（`<input type="file">`，匯入清單）
  - 載入順序：`data/sentences.js` → `js/quiz-logic.js` → `js/bank-store.js` → `app.js`

- [ ] **Step 1: 建立 `web/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>英文口說練習</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app">
    <h1>英文口說練習</h1>

    <div class="controls">
      <label class="control">
        <span>分類</span>
        <select id="category-select"></select>
      </label>
      <label class="control">
        <span>出題模式</span>
        <select id="mode-select">
          <option value="sequential">照順序</option>
          <option value="random">隨機出題</option>
        </select>
      </label>
    </div>

    <p id="empty-message" class="empty-message" hidden>題庫目前是空的，請先在練習中把句子加入題庫。</p>

    <section id="quiz-card" class="quiz-card">
      <p id="zh-sentence" class="zh-sentence"></p>

      <div class="en-wrapper">
        <p id="en-sentence" class="en-sentence"></p>
        <div id="en-cover" class="en-cover"></div>
      </div>

      <div class="button-row">
        <button id="reveal-button" class="btn btn-primary" type="button">看結果</button>
        <button id="replay-audio-button" class="btn btn-icon" type="button" hidden>🔊 重播發音</button>
      </div>

      <div class="button-row">
        <button id="toggle-bank-button" class="btn" type="button">☆ 加入練習題庫</button>
        <button id="next-button" class="btn btn-primary" type="button">下一題</button>
      </div>
    </section>

    <section class="bank-io">
      <button id="export-bank-button" class="btn" type="button">匯出練習題庫清單</button>
      <label class="btn btn-file">
        匯入練習題庫清單
        <input id="import-bank-input" type="file" accept="application/json" hidden>
      </label>
    </section>
  </main>

  <script src="data/sentences.js"></script>
  <script src="js/quiz-logic.js"></script>
  <script src="js/bank-store.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 建立 `web/style.css`**

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif;
  background: #f5f5f7;
  color: #1d1d1f;
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: clamp(12px, 4vw, 32px);
}

h1 {
  font-size: clamp(20px, 5vw, 28px);
  text-align: center;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.control {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  font-size: clamp(14px, 3vw, 16px);
  gap: 4px;
}

.control select {
  min-height: 48px;
  font-size: clamp(16px, 3.5vw, 18px);
  padding: 8px;
}

.empty-message {
  text-align: center;
  color: #86868b;
  font-size: clamp(14px, 3.5vw, 16px);
}

.quiz-card {
  background: white;
  border-radius: 16px;
  padding: clamp(16px, 5vw, 32px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.zh-sentence {
  font-size: clamp(20px, 5.5vw, 28px);
  text-align: center;
  margin: 0 0 16px;
}

.en-wrapper {
  position: relative;
  min-height: clamp(48px, 12vw, 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.en-sentence {
  font-size: clamp(18px, 5vw, 24px);
  text-align: center;
  margin: 0;
}

.en-cover {
  position: absolute;
  inset: 0;
  background: #1d1d1f;
  border-radius: 8px;
}

.en-cover[hidden] {
  display: none;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 12px;
}

.btn {
  min-height: 48px;
  padding: 0 clamp(16px, 4vw, 24px);
  font-size: clamp(15px, 3.5vw, 18px);
  border: none;
  border-radius: 12px;
  background: #e5e5ea;
  color: #1d1d1f;
  cursor: pointer;
}

.btn-primary {
  background: #0071e3;
  color: white;
}

.btn-file {
  display: inline-flex;
  align-items: center;
}

.bank-io {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 400px) {
  .button-row {
    flex-direction: column;
  }
  .btn {
    width: 100%;
  }
}
```

- [ ] **Step 3: 手動確認畫面可開啟**

Run: `open /Users/winnielee/Desktop/English/web/index.html`
Expected: 瀏覽器開啟頁面，看到標題、分類/模式下拉選單、黑色遮蓋色塊、各按鈕（此時按鈕還不會動作，因為 `app.js` 尚未實作，屬預期行為）。用瀏覽器開發者工具切換到 iPhone/iPad 尺寸，確認按鈕與文字仍清楚可讀、不溢出畫面。

- [ ] **Step 4: Commit**

```bash
cd /Users/winnielee/Desktop/English
git add web/index.html web/style.css
git commit -m "feat: add responsive static shell for practice page"
```

---

## Task 5: 應用程式邏輯串接 (`app.js`)

**Files:**
- Create: `web/app.js`

**Interfaces:**
- Consumes:
  - `window.SENTENCES`（`data/sentences.js`，`{id, category, zh, en}[]`）
  - `CATEGORY_ALL`, `CATEGORY_BANK`, `getCategories`, `filterSentences`, `createQuizQueue`（`quiz-logic.js`）
  - `loadBankIds`, `toggleBankId`, `exportBankToJson`, `importBankFromJson`（`bank-store.js`，`storage` 參數固定傳 `window.localStorage`）
  - Task 4 定義的所有 DOM id
- Produces: 無（葉節點，串接所有模組與 DOM）

- [ ] **Step 1: 實作 `web/app.js`**

```javascript
(function () {
  var storage = window.localStorage;
  var sentences = window.SENTENCES || [];

  var categorySelect = document.getElementById("category-select");
  var modeSelect = document.getElementById("mode-select");
  var emptyMessage = document.getElementById("empty-message");
  var quizCard = document.getElementById("quiz-card");
  var zhSentenceEl = document.getElementById("zh-sentence");
  var enSentenceEl = document.getElementById("en-sentence");
  var enCoverEl = document.getElementById("en-cover");
  var revealButton = document.getElementById("reveal-button");
  var replayAudioButton = document.getElementById("replay-audio-button");
  var toggleBankButton = document.getElementById("toggle-bank-button");
  var nextButton = document.getElementById("next-button");
  var exportBankButton = document.getElementById("export-bank-button");
  var importBankInput = document.getElementById("import-bank-input");

  var queue = null;
  var currentSentence = null;

  function populateCategorySelect() {
    var categories = getCategories(sentences);
    var allOptions = categories.concat([CATEGORY_ALL, CATEGORY_BANK]);
    categorySelect.innerHTML = "";
    for (var i = 0; i < allOptions.length; i++) {
      var option = document.createElement("option");
      option.value = allOptions[i];
      option.textContent = allOptions[i];
      categorySelect.appendChild(option);
    }
  }

  function speak(text) {
    if (!window.speechSynthesis) {
      return;
    }
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function updateBankButtonLabel() {
    var bankIds = loadBankIds(storage);
    var inBank = currentSentence && bankIds.indexOf(currentSentence.id) !== -1;
    toggleBankButton.textContent = inBank ? "★ 已加入（點擊移除）" : "☆ 加入練習題庫";
  }

  function resetCardForNewSentence() {
    enCoverEl.hidden = false;
    replayAudioButton.hidden = true;
    zhSentenceEl.textContent = currentSentence.zh;
    enSentenceEl.textContent = currentSentence.en;
    updateBankButtonLabel();
  }

  function loadNextSentence() {
    if (!queue) {
      return;
    }
    currentSentence = queue.next();
    if (!currentSentence) {
      quizCard.hidden = true;
      emptyMessage.hidden = false;
      return;
    }
    quizCard.hidden = false;
    emptyMessage.hidden = true;
    resetCardForNewSentence();
  }

  function rebuildQueueAndStart() {
    var bankIds = loadBankIds(storage);
    var filtered = filterSentences(sentences, categorySelect.value, bankIds);
    if (filtered.length === 0) {
      queue = null;
      currentSentence = null;
      quizCard.hidden = true;
      emptyMessage.hidden = false;
      return;
    }
    queue = createQuizQueue(filtered, modeSelect.value);
    loadNextSentence();
  }

  revealButton.addEventListener("click", function () {
    enCoverEl.hidden = true;
    replayAudioButton.hidden = false;
    speak(currentSentence.en);
  });

  replayAudioButton.addEventListener("click", function () {
    speak(currentSentence.en);
  });

  toggleBankButton.addEventListener("click", function () {
    if (!currentSentence) {
      return;
    }
    toggleBankId(storage, currentSentence.id);
    updateBankButtonLabel();
  });

  nextButton.addEventListener("click", function () {
    loadNextSentence();
  });

  categorySelect.addEventListener("change", rebuildQueueAndStart);
  modeSelect.addEventListener("change", rebuildQueueAndStart);

  exportBankButton.addEventListener("click", function () {
    var json = exportBankToJson(storage);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "practice-bank.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  importBankInput.addEventListener("change", function () {
    var file = importBankInput.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var result = importBankFromJson(storage, String(reader.result));
      if (!result.ok) {
        window.alert(result.error);
      } else {
        updateBankButtonLabel();
        if (categorySelect.value === CATEGORY_BANK) {
          rebuildQueueAndStart();
        }
      }
      importBankInput.value = "";
    };
    reader.readAsText(file);
  });

  populateCategorySelect();
  rebuildQueueAndStart();
})();
```

- [ ] **Step 2: 手動走過完整流程**

Run: `open /Users/winnielee/Desktop/English/web/index.html`

依序確認：
1. 下拉選單能看到 6 個分類 + 全部分類混合 + 我的練習題庫
2. 選一個分類，中文句子出現、英文被黑色色塊蓋住
3. 按「看結果」→ 英文句子出現、自動念出發音；按「🔊 重播發音」可再念一次
4. 按「☆ 加入練習題庫」→ 按鈕變成「★ 已加入」；再按一次變回「☆」
5. 按「下一題」→ 換一句，遮蓋恢復
6. 切換模式為「隨機出題」→ 出題順序改變、`下一題` 正常運作
7. 加入幾句到題庫後，把分類切成「我的練習題庫」→ 只出現加入過的句子
8. 按「匯出練習題庫清單」→ 瀏覽器下載一個 `practice-bank.json`
9. 開啟瀏覽器隱私視窗（模擬另一台裝置，題庫是空的）開同一頁面，按「匯入練習題庫清單」選剛剛匯出的檔案 → 「我的練習題庫」分類出現對應句子

Expected: 以上 9 點皆如描述運作，開發者工具 Console 沒有錯誤訊息。

- [ ] **Step 3: Commit**

```bash
cd /Users/winnielee/Desktop/English
git add web/app.js
git commit -m "feat: wire quiz UI to logic modules, TTS, and bank storage"
```

---

## Task 6: 產生正式資料、完整 QA、使用說明

**Files:**
- Create: `web/README.md`
- Generate (via script, not hand-written): `web/data/sentences.js`

**Interfaces:**
- 無新介面；本任務是整合驗收 + 文件。

- [ ] **Step 1: 執行轉換工具產生正式資料**

Run: `cd /Users/winnielee/Desktop/English/web/tools && python3 convert_excel.py`
Expected: 印出 `已轉換 1490 筆句子到 .../web/data/sentences.js`

- [ ] **Step 2: 驗證產生的資料筆數與分類統計**

Run:
```bash
cd /Users/winnielee/Desktop/English/web
python3 -c "
import json
with open('data/sentences.js', encoding='utf-8') as f:
    text = f.read()
json_part = text[len('window.SENTENCES = '):].rstrip().rstrip(';')
data = json.loads(json_part)
print('total:', len(data))
from collections import Counter
print(Counter(s['category'] for s in data))
"
```
Expected: `total: 1490`，且 6 個分類的數量與 spec 記載一致（情感表達 248、日常生活與基本對話 250、工作 250、天氣氣候 248、日常休閒 247、健康醫療 247）

- [ ] **Step 3: 重新跑一次 Task 1～3 的自動化測試，確認整合後仍全數通過**

Run:
```bash
cd /Users/winnielee/Desktop/English
python3 -m unittest discover -s web/tools -v
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
"$JSC" web/tests/test-helper.js web/js/quiz-logic.js web/tests/quiz-logic.test.js
"$JSC" web/tests/test-helper.js web/js/bank-store.js web/tests/bank-store.test.js
```
Expected: 全部通過（`OK` / `0 failed`）

- [ ] **Step 4: 用真實資料再走一次 Task 5 Step 2 的 9 點手動流程**

Run: `open /Users/winnielee/Desktop/English/web/index.html`
Expected: 用真正的 1490 句資料操作，流程與 Task 5 一致且順暢；額外用瀏覽器裝置模擬確認 iPhone SE（375px 寬）與 iPad（768px 寬）版面正常、按鈕不重疊。

- [ ] **Step 5: 撰寫 `web/README.md`**

```markdown
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

## 練習題庫收藏清單跨裝置搬移
收藏清單存在每台裝置各自的瀏覽器裡。要搬到另一台裝置：
1. 在原本的裝置上按「匯出練習題庫清單」，存下 `practice-bank.json`。
2. 把這個檔案傳到另一台裝置（AirDrop / 雲端硬碟皆可）。
3. 在另一台裝置的網頁上按「匯入練習題庫清單」選擇這個檔案。

## 開發測試
- Python 轉換工具測試：`cd web/tools && python3 -m unittest -v`
- JS 邏輯測試（macOS 內建 `jsc`，無需安裝任何套件）：
  ```bash
  JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
  "$JSC" web/tests/test-helper.js web/js/quiz-logic.js web/tests/quiz-logic.test.js
  "$JSC" web/tests/test-helper.js web/js/bank-store.js web/tests/bank-store.test.js
  ```
```

- [ ] **Step 6: Commit**

```bash
cd /Users/winnielee/Desktop/English
git add web/data/sentences.js web/README.md
git commit -m "feat: generate production sentence data and add usage docs"
```
