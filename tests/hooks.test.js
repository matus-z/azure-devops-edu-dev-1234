/**
 * tests/hooks.test.js — the hooks that hang off `InsuranceCalc.finalize`.
 *
 * Every hook REPLACES the single `finalize` slot, so each test loads calc.js
 * fresh and then only the hooks it is actually measuring.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCalc, loadWithoutCalc, APP_ROOT } = require("./helpers/load.js");

const F4 = "hooks/f4-deductible.js";
const F5 = "hooks/f5-minimum-payout.js";

test("a hook loaded before calc.js fails loudly", () => {
  assert.throws(() => loadWithoutCalc(F4), /must be loaded after calc\.js/);
  assert.throws(() => loadWithoutCalc(F5), /must be loaded after calc\.js/);
});

test("each hook takes over the finalize slot", () => {
  const bare = loadCalc();
  const hooked = loadCalc(F4);

  assert.notEqual(hooked.finalize, bare.finalize);
});

// --- F4: percentage deductible -----------------------------------------------

test("F4 deducts 50% of the payout", () => {
  const calc = loadCalc(F4);

  assert.equal(calc.calculatePayout({ damage: 100000, region: "Prague" }), 50000);
});

test("F4 applies after the region coefficient and the history malus", () => {
  const calc = loadCalc(F4);

  // 100000 * 0.95 * 0.8 * 0.5
  assert.equal(
    calc.calculatePayout({ damage: 100000, region: "Brno", priorClaims: 2 }),
    38000
  );
});

test("F4 never returns a negative payout", () => {
  const calc = loadCalc(F4);

  assert.equal(calc.calculatePayout({ damage: 0, region: "Prague" }), 0);
  assert.equal(calc.calculatePayout({ damage: -5000, region: "Prague" }), 0);
  assert.equal(
    calc.calculatePayout({ damage: 100000, region: "Prague", priorClaims: 11 }),
    0,
    "the F4 clamp also catches the negative malus case"
  );
});

// --- F5: minimum payout floor -------------------------------------------------

test("F5 lifts a small payout to the 10 000 CZK floor", () => {
  const calc = loadCalc(F5);

  assert.equal(calc.calculatePayout({ damage: 5000, region: "Prague" }), 10000);
  assert.equal(calc.calculatePayout({ damage: 1, region: "Prague" }), 10000);
});

test("F5 leaves a payout above the floor untouched", () => {
  const calc = loadCalc(F5);

  assert.equal(calc.calculatePayout({ damage: 100000, region: "Prague" }), 100000);
});

test("F5 does not round a payout sitting exactly on the floor", () => {
  const calc = loadCalc(F5);

  assert.equal(calc.calculatePayout({ damage: 10000, region: "Prague" }), 10000);
});

test("F5 does not invent a payout where there is no claim", () => {
  const calc = loadCalc(F5);

  assert.equal(calc.calculatePayout({ damage: 0, region: "Prague" }), 0);
  assert.equal(calc.calculatePayout({ damage: -5000, region: "Prague" }), 0);
});

test("KNOWN GAP: F5 passes a negative payout straight through", () => {
  const calc = loadCalc(F5);
  const payout = calc.calculatePayout({
    damage: 100000,
    region: "Prague",
    priorClaims: 11
  });

  // The `payout <= 0` guard exists to skip the floor for "no claim", but it
  // also lets the negative payout from the 11-claims case escape unclamped.
  assert.ok(payout < 0, "expected today's negative result, got " + payout);
});

// --- The two hooks together ---------------------------------------------------

test("index.html loads F4 before F5", () => {
  const html = fs.readFileSync(path.join(APP_ROOT, "index.html"), "utf8");

  assert.ok(html.indexOf(F4) > -1, "index.html must load " + F4);
  assert.ok(html.indexOf(F5) > -1, "index.html must load " + F5);
  assert.ok(
    html.indexOf(F4) < html.indexOf(F5),
    "the test below assumes this order"
  );
});

test("KNOWN GAP: loading both hooks silently drops F4 — they share one slot", () => {
  const both = loadCalc(F4, F5);
  const onlyF5 = loadCalc(F5);
  const input = { damage: 100000, region: "Prague" };

  // Neither hook chains to the previous `finalize`, so the last one loaded
  // wins outright. With index.html's order that is F5, and the F4 deductible
  // never runs — the page pays 100 000 where F4 alone would pay 50 000.
  assert.equal(both.calculatePayout(input), onlyF5.calculatePayout(input));
  assert.equal(both.calculatePayout(input), 100000);
  assert.notEqual(both.calculatePayout(input), 50000);
});
