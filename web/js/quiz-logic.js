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
