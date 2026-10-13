/** Shared assert helper for tsx test files. */
export function createAssert() {
  let failed = 0;
  let passed = 0;

  function assert(cond: boolean, msg: string) {
    if (!cond) {
      console.error(`FAILED: ${msg}`);
      failed += 1;
    } else {
      console.log(`PASSED: ${msg}`);
      passed += 1;
    }
  }

  function summary(suiteName: string) {
    console.log(`\n${suiteName}: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  }

  return { assert, summary, get failed() { return failed; }, get passed() { return passed; } };
}
