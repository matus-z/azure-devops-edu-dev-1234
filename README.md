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

The calculation logic (`calc.js`) is deliberately kept separate from the UI glue
(`app.js`) so that changes to the formula only touch `calc.js`.

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
