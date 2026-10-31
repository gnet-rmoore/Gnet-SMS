import {
  formatMoneyInputValue,
  normalizeMoneyInputValue,
} from "../src/lib/moneyInput.ts";

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected "${expected}", received "${actual}"`);
  }
}

assertEqual(formatMoneyInputValue("5000"), "5,000", "group thousands");
assertEqual(formatMoneyInputValue("5000.25"), "5,000.25", "keep decimals");
assertEqual(formatMoneyInputValue("0005000"), "5,000", "strip leading zeros");
assertEqual(normalizeMoneyInputValue("5,000.25"), "5000.25", "remove grouping");
assertEqual(normalizeMoneyInputValue("$5,000.25"), "5000.25", "ignore symbols");
assertEqual(normalizeMoneyInputValue("1.2.3"), "1.23", "allow one decimal separator");

console.log("Money input formatting tests passed");
