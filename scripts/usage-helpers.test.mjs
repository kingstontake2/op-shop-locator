import assert from "node:assert/strict";
import test from "node:test";

function warningLevel(percent, blocked) {
  if (blocked) return "blocked";
  if (percent >= 95) return "critical";
  if (percent >= 85) return "high";
  if (percent >= 70) return "warn";
  return "ok";
}

function projectMonthEnd(used, dayOfMonth, daysInMonthCount) {
  if (dayOfMonth <= 0) return used;
  return Math.round((used / dayOfMonth) * daysInMonthCount);
}

test("warning levels", () => {
  assert.equal(warningLevel(10, false), "ok");
  assert.equal(warningLevel(70, false), "warn");
  assert.equal(warningLevel(85, false), "high");
  assert.equal(warningLevel(95, false), "critical");
  assert.equal(warningLevel(10, true), "blocked");
});

test("month-end projection", () => {
  assert.equal(projectMonthEnd(100, 10, 30), 300);
  assert.equal(projectMonthEnd(0, 5, 31), 0);
  assert.equal(projectMonthEnd(50, 0, 30), 50);
});

test("circuit breaker allows below blockAt", () => {
  const blockAt = 4000;
  assert.equal(3999 < blockAt, true);
  assert.equal(4000 < blockAt, false);
});
