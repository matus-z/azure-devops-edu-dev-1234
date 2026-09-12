# Insurance Claim Calculator

A small, dependency-free web app for calculating an insurance claim payout from a
set of claim parameters. It runs entirely in the browser — no build step, no
server, no npm install.

## Usage

Open `index.html` in a browser.

Fill in the policyholder and claim details, then click **Calculate payout**.

## Project structure

| File         | Responsibility                                                        |
| ------------ | --------------------------------------------------------------------- |
| `index.html` | Form markup and page layout.                                          |
| `style.css`  | Styling.                                                              |
| `calc.js`    | Core payout calculation (`InsuranceCalc.calculatePayout`).            |
| `app.js`     | UI glue — reads the form, calls the core, renders the result.         |
| `tests/`     | Automated tests (`node --test`).                                      |

The calculation logic (`calc.js`) is deliberately kept separate from the UI glue
(`app.js`) so that changes to the formula only touch `calc.js`.

## Tests

The tests run on the Node.js built-in test runner — no dependencies, no
`npm install`:

```
node --test tests/
```

Each test loads the browser scripts into a fresh `vm` context with a `window`
object, and — for `app.js` — a minimal fake `document`
(`tests/helpers/load.js`). A fresh context per test matters: hooks *replace*
`InsuranceCalc.finalize`, so leaked state would quietly change what is being
measured.

| File                    | Covers                                                     |
| ----------------------- | ---------------------------------------------------------- |
| `tests/calc.test.js`    | The core formula and the `finalize` extension point.        |
| `tests/hooks.test.js`   | Each hook on its own, and the two of them together.         |
| `tests/app.test.js`     | Reading the form, calling the core, rendering the result.   |

Tests named `KNOWN GAP:` pin behaviour that today contradicts what the code
documents. They are there so the behaviour is visible and so a future fix
shows up as a failing test rather than a silent change.

`azure-pipelines.yml` runs the same command in a single step.

## Extending the calculation

`calc.js` exposes a hook extension point, `InsuranceCalc.finalize(payout, context)`,
which by default is a pass-through. A hook can replace this slot to adjust the
final payout:

```js
InsuranceCalc.finalize = function (payout, ctx) {
  // ctx = { input, damage, deductible, base }
  return payout;
};
```

Load any hook script *after* `calc.js`. This slot must be preserved in every
future version of `calc.js` — dropping it would silently disable all hooks.
