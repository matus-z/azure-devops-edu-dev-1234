/**
 * tests/calc.test.js — the core payout calculation, with no hooks loaded.
 *
 *     payout = max(0, damage) * regionCoefficient * historyMalus
 *     regionCoefficient: Prague 1.0, everywhere else 0.95   (F1)
 *     historyMalus:      1 - 0.1 * priorClaims              (F3 / F3.1)
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCalc } = require("./helpers/load.js");

test("calc.js exposes the public surface on window", () => {
  const calc = loadCalc();

  assert.equal(typeof calc.calculatePayout, "function");
  assert.equal(typeof calc.finalize, "function", "the hook extension point must exist");
});

test("Prague keeps the full damage amount (F1)", () => {
  const calc = loadCalc();

  assert.equal(calc.calculatePayout({ damage: 100000, region: "Prague" }), 100000);
});

test("regions other than Prague are reduced to 95% (F1)", () => {
  const calc = loadCalc();

  assert.equal(calc.calculatePayout({ damage: 100000, region: "Brno" }), 95000);
  assert.equal(calc.calculatePayout({ damage: 100000, region: "Ostrava" }), 95000);
  assert.equal(calc.calculatePayout({ damage: 100000, region: "Other" }), 95000);
});

test("a missing region falls into the non-Prague branch", () => {
  const calc = loadCalc();

  assert.equal(calc.calculatePayout({ damage: 100000 }), 95000);
});

test("the region check is case sensitive — only exactly \"Prague\" is full value", () => {
  const calc = loadCalc();

  assert.equal(calc.calculatePayout({ damage: 100000, region: "prague" }), 95000);
});

test("each previous claim reduces the payout by 10% (F3.1)", () => {
  const calc = loadCalc();
  const forClaims = (n) =>
    calc.calculatePayout({ damage: 100000, region: "Prague", priorClaims: n });

  assert.equal(forClaims(0), 100000);
  assert.equal(forClaims(1), 90000);
  assert.equal(forClaims(2), 80000);
  assert.equal(forClaims(5), 50000);
});

test("previous claims reduce rather than increase the payout (the F3 sign bug stays fixed)", () => {
  const calc = loadCalc();
  const none = calc.calculatePayout({ damage: 100000, region: "Prague", priorClaims: 0 });
  const some = calc.calculatePayout({ damage: 100000, region: "Prague", priorClaims: 3 });

  assert.ok(some < none, "3 previous claims must pay less than none, got " + some);
});

test("the region coefficient and the history malus compound", () => {
  const calc = loadCalc();

  // 100000 * 0.95 * (1 - 0.2)
  assert.equal(calc.calculatePayout({ damage: 100000, region: "Brno", priorClaims: 2 }), 76000);
});

test("a missing priorClaims counts as none", () => {
  const calc = loadCalc();

  assert.equal(calc.calculatePayout({ damage: 100000, region: "Prague" }), 100000);
  assert.equal(
    calc.calculatePayout({ damage: 100000, region: "Prague", priorClaims: null }),
    100000
  );
});

test("negative damage pays out nothing", () => {
  const calc = loadCalc();

  assert.equal(calc.calculatePayout({ damage: -5000, region: "Prague" }), 0);
});

test("non-numeric and missing damage pay out nothing", () => {
  const calc = loadCalc();

  assert.equal(calc.calculatePayout({ damage: "abc", region: "Prague" }), 0);
  assert.equal(calc.calculatePayout({ region: "Prague" }), 0);
  assert.equal(calc.calculatePayout({ damage: null, region: "Prague" }), 0);
});

test("numeric strings from the form are coerced", () => {
  const calc = loadCalc();

  assert.equal(
    calc.calculatePayout({ damage: "100000", region: "Prague", priorClaims: "2" }),
    80000
  );
});

test("10 previous claims wipe the payout out entirely", () => {
  const calc = loadCalc();

  assert.equal(
    calc.calculatePayout({ damage: 100000, region: "Prague", priorClaims: 10 }),
    0
  );
});

test("KNOWN GAP: 11+ previous claims return a negative payout", () => {
  const calc = loadCalc();
  const payout = calc.calculatePayout({
    damage: 100000,
    region: "Prague",
    priorClaims: 11
  });

  // calc.js documents "never negative", but `Math.max(0, ...)` clamps the
  // DAMAGE, not the payout — so a malus below zero flips the sign. This test
  // pins the behaviour as it is today; if the clamp moves to the payout, this
  // is the test that will say so.
  assert.ok(payout < 0, "expected today's negative result, got " + payout);
  assert.equal(Math.round(payout), -10000);
});

test("finalize is a pass-through by default", () => {
  const calc = loadCalc();

  assert.equal(calc.finalize(12345), 12345);
});

test("calculatePayout routes its result through the finalize hook slot", () => {
  const calc = loadCalc();
  const seen = [];

  calc.finalize = function (payout, context) {
    seen.push({ payout: payout, context: context });
    return 42;
  };

  const result = calc.calculatePayout({ damage: 100000, region: "Brno" });

  assert.equal(result, 42, "the hook's return value must be what callers get");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].payout, 95000);
});

test("the finalize hook receives the raw damage and the pre-hook payout as context", () => {
  const calc = loadCalc();
  let context = null;

  calc.finalize = function (payout, ctx) {
    context = ctx;
    return payout;
  };

  const input = { damage: "100000", region: "Brno", priorClaims: 1 };
  calc.calculatePayout(input);

  assert.equal(context.input, input, "the original input is handed through as-is");
  assert.equal(context.damage, 100000, "damage is the coerced number");
  assert.equal(context.base, 85500, "base is the payout before the hook ran");
});
