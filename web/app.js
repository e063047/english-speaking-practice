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
