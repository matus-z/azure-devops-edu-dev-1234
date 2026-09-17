/**
 * tests/app.test.js — the UI glue: reading the form, calling the core,
 * rendering the result. Driven against the fake DOM in helpers/load.js.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadApp } = require("./helpers/load.js");

/** A fully filled form; individual tests override what they care about. */
const FORM = {
  customerName: "Jane Doe",
  age: "42",
  country: "CZ",
  region: "Prague",
  damage: "100000",
  priorClaims: "0"
};

function appWith(overrides, ...hooks) {
  const app = loadApp(...hooks);
  app.fill(Object.assign({}, FORM, overrides));
  return app;
}

test("index.html hides the result section until something is calculated", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { APP_ROOT } = require("./helpers/load.js");
  const html = fs.readFileSync(path.join(APP_ROOT, "index.html"), "utf8");

  // app.js only ever clears `hidden`, so the initial state lives in the markup.
  assert.match(html, /<section id="result"[^>]*\shidden\b/);
});

test("the result section starts hidden", () => {
  const app = loadApp();

  assert.equal(app.result.hidden, true, "loading app.js must not reveal the result");
});

test("submitting renders the calculated payout", () => {
  const app = appWith({});

  app.submit();

  assert.equal(app.resultValue.textContent, "100,000 CZK");
  assert.equal(app.result.hidden, false);
});

test("submitting does not navigate away", () => {
  const app = appWith({});

  const event = app.submit();

  assert.equal(event.defaultPrevented, true, "the form submit must be prevented");
});

test("the rendered payout goes through the core calculation", () => {
  const app = appWith({ region: "Brno", priorClaims: "2" });

  app.submit();

  // 100000 * 0.95 * 0.8
  assert.equal(app.resultValue.textContent, "76,000 CZK");
});

test("the summary names the policyholder, damage, region and country", () => {
  const app = appWith({});

  app.submit();

  assert.equal(
    app.resultSummary.textContent,
    "Jane Doe — damage 100,000 CZK (Prague, CZ)."
  );
});

test("a blank name falls back to \"The policyholder\"", () => {
  const app = appWith({ customerName: "   " });

  app.submit();

  assert.ok(
    app.resultSummary.textContent.startsWith("The policyholder — "),
    "got: " + app.resultSummary.textContent
  );
});

test("surrounding whitespace is trimmed off the name", () => {
  const app = appWith({ customerName: "  Jane Doe  " });

  app.submit();

  assert.ok(app.resultSummary.textContent.startsWith("Jane Doe — "));
});

test("an empty previous-claims field counts as none", () => {
  const app = appWith({ priorClaims: "" });

  app.submit();

  assert.equal(app.resultValue.textContent, "100,000 CZK");
});

test("an empty damage field renders a zero payout rather than NaN", () => {
  const app = appWith({ damage: "" });

  app.submit();

  assert.equal(app.resultValue.textContent, "0 CZK");
  assert.ok(
    app.resultSummary.textContent.indexOf("NaN") === -1,
    "got: " + app.resultSummary.textContent
  );
});

test("the payout is rendered without decimals", () => {
  const app = appWith({ damage: "1234.56", region: "Brno" });

  app.submit();

  assert.equal(app.resultValue.textContent, "1,173 CZK");
});

test("the result is scrolled into view on submit", () => {
  const app = appWith({});

  app.submit();

  assert.equal(app.result.scrollIntoViewCalls, 1);
});

test("resetting hides the result again", () => {
  const app = appWith({});
  app.submit();
  assert.equal(app.result.hidden, false);

  app.reset();

  assert.equal(app.result.hidden, true);
});

test("resubmitting re-renders with the new values", () => {
  const app = appWith({});
  app.submit();
  assert.equal(app.resultValue.textContent, "100,000 CZK");

  app.fill({ damage: "50000" });
  app.submit();

  assert.equal(app.resultValue.textContent, "50,000 CZK");
});

test("app.js renders whatever the loaded hooks decide", () => {
  const app = appWith({}, "hooks/f4-deductible.js");

  app.submit();

  assert.equal(
    app.resultValue.textContent,
    "50,000 CZK",
    "the UI must not carry its own copy of the formula"
  );
});

// The config repo's pipeline replaces `__VERSION__` when it builds a release.
// Nothing at run time would notice the slot missing — the substitution would
// simply do nothing and the page would ship without a version — so the
// contract is pinned here.
//
// Both spellings are accepted on purpose: these tests run against the source
// (placeholder still in place) in the vendor pipeline, and against the built
// package (placeholder already replaced) in the config pipeline.
test("index.html carries a version slot for the release build to fill", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { APP_ROOT } = require("./helpers/load.js");
  const html = fs.readFileSync(path.join(APP_ROOT, "index.html"), "utf8");

  assert.match(html, /id="appVersion">(__VERSION__|v\d+\.\d+\.\d+)</);
});
