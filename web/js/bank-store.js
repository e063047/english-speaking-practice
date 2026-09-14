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
