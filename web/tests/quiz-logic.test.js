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
