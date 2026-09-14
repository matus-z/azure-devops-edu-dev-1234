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
| `ci/`               | PowerShell scripts the pipeline steps call.                     |
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

`azure-pipelines.yml` — four stages, left to right. Everything a stage does is
drawn inside its own container; jobs stacked on top of each other run in
parallel, jobs side by side run one after the other.

```mermaid
flowchart LR
  subgraph S1["1 · Build"]
    b["Zostavenie aplikácie<br/>src/ → dist/"]
  end
  subgraph S2["2 · Overenie — dva joby súbežne"]
    t["Automatické testy<br/>node --test tests/"]
    l["Statická kontrola<br/>node --check src/"]
  end
  subgraph S3["3 · Balík"]
    p["Publikovanie overeného balíka<br/>artefakt app"]
  end
  subgraph S4["4 · Kontrola verzie"]
    v["Tag ukazuje na main<br/>len pri behu z tagu v*"]
  end
  b --> t
  b --> l
  t --> p
  l --> p
  t -.-> v
  l -.-> v
```

`Package` and `VersionCheck` both depend on `Verify` only, so they too run in
parallel — the dashed edges mark `VersionCheck` as conditional: it runs on
tag-triggered runs and is skipped otherwise.

| Stage          | What it does                                                        |
| -------------- | ------------------------------------------------------------------- |
| `Build`        | Checks the required files exist, copies `src/` into `dist/`, guards against `type="module"`. |
| `Verify`       | Two parallel jobs: `node --test tests/` and `node --check` over every script in `src/`. |
| `Package`      | Republishes the verified build as the `app` artifact.               |
| `VersionCheck` | Tag runs only: the tag must be `vX.Y.Z` and point at a commit in `main`. |

The config repo consumes the tag this pipeline verifies.

### `ci/`

Anything longer than a one-liner lives in a script rather than inline in the
YAML, so it can be run and debugged locally — `./ci/Build-Package.ps1` behaves
the same on a workstation as it does on the agent. Only the single-line test
command is still inline.

| Script                       | Called by      |
| ---------------------------- | -------------- |
| `Build-Package.ps1`          | `Build`        |
| `Test-FileProtocol.ps1`      | `Build`        |
| `Test-JavaScriptSyntax.ps1`  | `Verify / lint`|
| `Test-ReleaseTag.ps1`        | `VersionCheck` |
| `Test-NodeVersion.ps1`       | `Verify` (both jobs) |

The pipeline does not install Node — `Test-NodeVersion.ps1` only checks that
the agent already has v20 or newer and fails with a clear message if it does
not. Installing Node is part of preparing the machines in the pool, not part of
every run: the agents are on-prem and a per-run download is both slow and a
dependency on internet access they may not have.

The pipeline runs on Linux agents (`Pool1_Linux`), so the steps use `pwsh`
rather than `powershell` and **PowerShell 7 must be installed on every agent in
the pool** alongside Node and git. The scripts themselves are cross-platform:
they build paths with `Join-Path` and shell out only to `node` and `git`, so the
same script runs on a Windows workstation and on the Linux agent.

Names follow PowerShell's `Verb-Noun` convention using approved verbs, so
`Get-Verb` stays meaningful and the scripts read the same way as any other
cmdlet. Each takes parameters with sensible defaults instead of reading
pipeline variables directly — that is what makes them runnable outside CI.
Failures are reported with `##vso[task.logissue type=error]` and a non-zero
exit code.

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
