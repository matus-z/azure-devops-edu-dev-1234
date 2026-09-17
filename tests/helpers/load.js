/**
 * tests/helpers/load.js — loads the browser scripts into a Node test harness.
 *
 * The app is dependency-free and browser-only: every script is an IIFE that
 * attaches to `window` and, in app.js's case, reaches for `document`. Rather
 * than pulling in a DOM library, each test gets a fresh `vm` context with a
 * `window` object and — when app.js is under test — a minimal fake `document`.
 *
 * A fresh context per test matters: the hooks REPLACE `InsuranceCalc.finalize`,
 * so state leaking between tests would silently change what is being measured.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_ROOT = path.join(__dirname, "..", "..", "src");

/** Every element id app.js is allowed to ask for. */
const ELEMENT_IDS = [
  "claim-form",
  "result",
  "resultValue",
  "resultSummary",
  "customerName",
  "age",
  "country",
  "region",
  "damage",
  "priorClaims"
];

function createElement(id) {
  const listeners = new Map();
  return {
    id,
    value: "",
    textContent: "",
    hidden: false,
    scrollIntoViewCalls: 0,
    addEventListener(type, fn) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(fn);
    },
    fire(type, event) {
      const fns = listeners.get(type) || [];
      fns.forEach((fn) => fn(event));
      return fns.length;
    },
    scrollIntoView() {
      this.scrollIntoViewCalls += 1;
    }
  };
}

function createDocument() {
  const elements = new Map(ELEMENT_IDS.map((id) => [id, createElement(id)]));
  // #result carries the `hidden` attribute in index.html; app.js only ever
  // clears it. Mirror the markup so the initial state is the real one.
  elements.get("result").hidden = true;
  return {
    elements,
    getElementById(id) {
      if (!elements.has(id)) {
        // Loud on purpose: a renamed id in index.html should fail the test,
        // not quietly hand back null the way a real document would.
        throw new Error('fake DOM: unknown element id "' + id + '"');
      }
      return elements.get(id);
    }
  };
}

function createSandbox(withDocument) {
  const sandbox = { window: {} };
  if (withDocument) {
    sandbox.document = createDocument();
    sandbox.window.document = sandbox.document;
  }
  return vm.createContext(sandbox);
}

function runScript(sandbox, relativePath) {
  const file = path.join(APP_ROOT, relativePath);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox;
}

/**
 * Load calc.js plus any hooks, in order, and return the resulting
 * `InsuranceCalc` object.
 *
 * @param {...string} hooks - paths relative to the app root, e.g.
 *   "hooks/f4-deductible.js".
 */
function loadCalc(...hooks) {
  const sandbox = createSandbox(false);
  runScript(sandbox, "calc.js");
  hooks.forEach((hook) => runScript(sandbox, hook));
  return sandbox.window.InsuranceCalc;
}

/**
 * Load the whole page's scripts (calc.js, any hooks, then app.js) against a
 * fake DOM. Returns handles the tests drive the form with.
 */
function loadApp(...hooks) {
  const sandbox = createSandbox(true);
  runScript(sandbox, "calc.js");
  hooks.forEach((hook) => runScript(sandbox, hook));
  runScript(sandbox, "app.js");

  const byId = (id) => sandbox.document.getElementById(id);

  return {
    calc: sandbox.window.InsuranceCalc,
    byId,
    form: byId("claim-form"),
    result: byId("result"),
    resultValue: byId("resultValue"),
    resultSummary: byId("resultSummary"),

    /** Fill the form fields. Values are written as strings, like a real input. */
    fill(values) {
      Object.keys(values).forEach((id) => {
        byId(id).value = String(values[id]);
      });
    },

    /** Submit the form; returns the event so tests can inspect preventDefault. */
    submit() {
      let defaultPrevented = false;
      const event = {
        preventDefault() {
          defaultPrevented = true;
        },
        get defaultPrevented() {
          return defaultPrevented;
        }
      };
      byId("claim-form").fire("submit", event);
      return event;
    },

    reset() {
      byId("claim-form").fire("reset", {});
    }
  };
}

/** Load a script into an empty sandbox — used to test the hooks' guard clause. */
function loadWithoutCalc(relativePath) {
  return runScript(createSandbox(false), relativePath);
}

module.exports = { loadCalc, loadApp, loadWithoutCalc, APP_ROOT };
