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
