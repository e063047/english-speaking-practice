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
