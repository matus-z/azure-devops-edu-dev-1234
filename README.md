# Insurance Claim Calculator

A small, dependency-free web app for calculating an insurance claim payout from a
set of claim parameters. It runs entirely in the browser — no build step, no
server, no npm install.

## Usage

Open `src/index.html` in a browser.

Fill in the policyholder and claim details, then click **Calculate payout**.

## Project structure

| Path                | Responsibility                                                  |
| ------------------- | --------------------------------------------------------------- |
| `src/index.html`    | Form markup and page layout.                                    |
| `src/style.css`     | Styling.                                                        |
| `src/calc.js`       | Core payout calculation (`InsuranceCalc.calculatePayout`).      |
| `src/app.js`        | UI glue — reads the form, calls the core, renders the result.   |
| `src/hooks/`        | Optional hooks that replace `InsuranceCalc.finalize`.           |
| `tests/`            | Automated tests (`node --test`).                                |
| `azure-pipelines.yml` | The pipeline — see below.                                     |

Everything that ships lives under `src/`, and nothing else does. That is what
lets the pipeline build the package with a plain directory copy: a new file in
`src/` reaches the artifact on its own, and `tests/` and this README stay out of
it without having to be excluded.

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

## Pipeline

`azure-pipelines.yml` — Build → (Testy ‖ Statická kontrola) → Balík → Kontrola verzie.

| Stage          | What it does                                                        |
| -------------- | ------------------------------------------------------------------- |
| `Build`        | Checks the required files exist, copies `src/` into `dist/`, guards against `type="module"`. |
| `Verify`       | Two parallel jobs: `node --test tests\` and `node --check` over every script in `src/`. |
| `Package`      | Republishes the verified build as the `app` artifact.               |
| `VersionCheck` | Tag runs only: the tag must be `vX.Y.Z` and point at a commit in `main`. |

The config repo (`kalkulacka-config`) consumes the tag this pipeline verifies.

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
