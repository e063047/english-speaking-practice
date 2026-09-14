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
