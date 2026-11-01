# Wind Design Notebook – Stage 1: Tower Module (Turm) – Design

Date: 2026-11-01 · Status: draft for review · Author: Suavi Yildirim

## 1. Purpose and context

Wind Design Notebook is a personal, public curiosity project about wind turbine
design, published on GitHub Pages at
`https://suavi-yildirim.github.io/wind-design-notebook/`. The site will have three
modules sharing one turbine: **Rotor → Turm → Straße**. Stage 1 is the tower
module; rotor and transport follow as separate spec → plan → build cycles.

**Audiences**

- Primary: a design team lead (Konstrukteur) – wants to see sound engineering
  reasoning, governing constraints, honest assumptions and verification.
- Secondary: non-technical readers (e.g. HR) – need a clear verdict, scale
  comparisons and plain language within 30 seconds.

**Ground rules**

- Public sources only. No company names, branding, data or geometries of any
  turbine or tower manufacturer. Tower geometries are the author's own concept
  geometries.
- Every result shows its formula, assumptions and source. A limitations section
  is mandatory.
- German is the primary language, English alongside.

**Success criteria**

1. A team lead can pick a preset, change hub height / diameters / wall thickness /
   foundation stiffness and immediately see every check as a utilisation ratio
   η with the governing check highlighted.
2. The design-space map shows why steel towers hit the road-transport diameter
   limit at large hub heights and where hybrid towers become necessary.
3. Natural frequency from the browser (Rayleigh) agrees with an independent
   Python FE model within 3 % for all presets.
4. A non-technical reader understands the verdict and the main trade-off from
   the top of the page and the guided tour.
5. Both languages complete; site live on GitHub Pages; tests green in CI.

## 2. Approach

Plain static site with no build step (chosen over Vite/TypeScript and over
Python-in-the-browser):

- HTML, CSS and native ES modules, served by GitHub Pages as they are, so
  "view source" shows the formulas.
- Calculation core as pure JS modules with `// @ts-check` and JSDoc types,
  tested with `node --test` (no npm dependencies).
- Independent verification in Python (numpy/scipy FE beam model) that writes
  reference fixtures; JS tests compare against them.
- Libraries from CDN, versions pinned: KaTeX (formulas), marked (Markdown).
- No 3D in stage 1 (SVG only).

**Rust** is out of stage 1. It is planned as its own later stage, `verify-rs/`:
a third independent FE implementation (e.g. with `nalgebra`) checked against the
same fixture files. Stage 1 only fixes the shared fixture format (§8.3).

## 3. Repository structure

```
index.html                 Landing: "Rotor → Turm → Straße"
turm/index.html            Tower module
about/index.html           About this project
assets/css/                site.css, print.css
src/calc/                  Pure functions, no DOM, SI units
  section.js               Circular hollow section properties
  tower.js                 Tower definition → discretised stations
  foundation.js            Rotational spring k_φ handling
  frequency.js             Hand formula, Rayleigh f1, 1P/3P bands
  loads.js                 Thrust, tower drag, moment line
  segments.js              Steel segments, concrete ring parts
  crane.js                 Heaviest lift, hook height
  checks.js                All checks → utilisation objects
  sweep.js                 Design-space grid evaluation
  evaluate.js              One entry point: inputs → full result
src/ui/                    DOM code
  app.js                   Wiring, render loop
  inputs.js                Input fields + sliders, validation
  state.js                 URL state encode/decode, localStorage prefs
  variants.js              Up to 3 saved variants
  explain.js               Plain-language sentences from results
  tour.js                  Guided tour (4 steps)
  export.js                CSV export, print trigger
src/charts/                Hand-built SVG
  campbell.js  tower-sketch.js  utilisation-bars.js  feasibility-map.js
src/i18n/                  de.json, en.json, i18n.js
content/de/*.md            Explanations, assumptions, tour, limitations, about
content/en/*.md
content/formulas.json      TeX per formula ID (language-neutral)
content/glossary.json      DE ↔ EN terms
data/presets/              generic-3mw.json, generic-5mw.json, generic-7mw.json
test/                      node --test suites
verify/                    Python verification
  fe_beam.py  generate_fixtures.py  test_fe_beam.py  requirements.txt
  fixtures/*.json
.github/workflows/pages.yml
docs/superpowers/          specs and plans (not deployed)
```

All internal links and fetches are **relative**, because the site lives under
the base path `/wind-design-notebook/`. Local development uses
`python3 -m http.server` (fetching `.md`/`.json` doesn't work over `file://`).

## 4. Data flow

```
preset JSON ─┐
URL state ───┼─► inputs (SI) ─► evaluate() ─► result object ─► render (cards, charts, verdict)
user edits ──┘                       │
                                     └─► sweep() for the design-space map
```

- `evaluate(inputs)` is pure and synchronous. It returns
  `{ tower, f1, bands, loads, segments, crane, masses, checks[], governing, errors[] }`.
- Each numeric result carries `formulaId` and `assumptionIds[]`. The UI looks
  these up in `content/formulas.json` and `content/<lang>/*.md`.
- Each check: `{ id, eta, limit, demand, unit, formulaId, governingInput }`.
  `governing` = check with max η. Verdict: green η ≤ 0.9, amber 0.9 < η ≤ 1.0,
  red η > 1.0.
- Recalculation on `input` events, throttled with `requestAnimationFrame`.

## 5. Calculation scope

All internal values are SI. The UI shows m, mm, t, kN, MN·m, MPa, Hz, rpm.

### 5.1 Section and tower geometry

- Circular hollow section, exact:
  A = π/4·(D² − (D−2t)²), I = π/64·(D⁴ − (D−2t)⁴), W = 2I/D.
- **Steel tower:** list of segments, each with bottom/top diameter and wall
  thickness. D and t vary linearly within a segment. Steel S355, E = 210 GPa,
  ρ = 7850 kg/m³. Mass per metre μ = ρ·A·k_add, k_add = 1.08 (flanges,
  internals; adjustable assumption).
- **Hybrid tower:** concrete tube from 0 to transition height h_tr (bottom and
  top diameter, wall thickness), steel tube above. Concrete C50/60,
  E_cm = 37 GPa, ρ = 2500 kg/m³, uncracked section. The transition piece is not
  modelled separately (limitation).
- `tower.js` discretises the tower into N = 100 stations (EI, μ, D, t, material).
  Every later calculation uses these stations.

### 5.2 Foundation

Rotational spring k_φ at the tower base (N·m/rad). Presets set a public typical
value, and the user can change it. Lateral foundation flexibility is neglected
(limitation).

### 5.3 Natural frequency f1

- **Hand formula** (shown for intuition, uniform tower):
  1/k = H³/(3EI) + H²/k_φ, f₁ = 1/(2π)·√(k / (M_RNA + 0.24·m_tower)).
- **Calculation used for checks:** Rayleigh quotient with the static deflection
  line w(z) under a unit tip load: curvature F·(H−z)/EI(z) integrated twice
  numerically (trapezoidal rule over the stations), plus rigid rotation
  θ₀ = F·H/k_φ:
  ω² = (∫EI·w''² dz + k_φ·w'(0)²) / (∫μ·w² dz + M_RNA·w(H)²).
  Rotary inertia of the RNA is neglected (limitation).
- **Verification:** Python FE (§8.2). For presets, the page shows Rayleigh and FE
  side by side with the deviation in %. For custom inputs, Rayleigh only, with
  the note "no FE reference for this configuration".

### 5.4 Excitation bands and frequency check

- 1P band = [n_min/60, n_max/60] Hz, 3P band = 3·1P band.
- Soft-stiff window with margin m (default 0.10):
  f₁ must lie in [1P_max·(1+m), 3P_min·(1−m)].
- η_f = max(1P_max·(1+m)/f₁, f₁/(3P_min·(1−m))).
- If the window is empty (1P_max·(1+m) ≥ 3P_min·(1−m)), the check reports this
  as an error with an explanation instead of an η.
- Campbell diagram: rotor speed on the x-axis, frequency on the y-axis, 1P/3P
  lines, operating range shaded, margin bands, f₁ as a horizontal line.

### 5.5 Load indicator and stress check

- Rotor thrust at rated wind: F_T = ½·ρ_air·A_rotor·C_T·V_rated²
  (ρ_air = 1.225 kg/m³, C_T from preset).
- Tower drag: q(z) = ½·ρ_air·v(z)²·c_f·D(z), v(z) = V_rated·(z/H)^α,
  α = 0.2, c_f = 0.7 (assumptions, adjustable).
- Design moment: M_d(z) = γ_F·k_peak·[F_T·(H−z) + ∫_z^H q(ζ)·(ζ−z) dζ],
  γ_F = 1.35, k_peak = 1.5 (disclosed assumption).
  Normal force N(z) = (M_RNA + tower mass above z)·g·γ_G, γ_G = 1.35.
- Steel stations only: σ = N/A + M_d/W, η_σ = σ / (f_y(t)/γ_M1), γ_M1 = 1.1,
  f_y for S355 by thickness (≤16 mm: 355, ≤40: 345, ≤63: 335, ≤80: 325 MPa).
  The check reports max η_σ and its height.
- Clearly labelled **"load indicator, not a design load"**: real extreme loads
  come from aeroelastic DLC simulations (IEC 61400-1).
- D/t plausibility: shown, with a hint when D/t > 300 or < 80. Not a check
  with η.

### 5.6 Segments, transport, crane

- **Steel segments:** greedy from top to bottom. A segment ends when the next
  station would exceed L_max (default 30 m) or m_max (default 80 t). Output per
  segment: z range, length, D_max, mass.
- **Transport check:** η_D = max segment diameter / D_transport
  (default 4.30 m, adjustable). Also η_L = length / L_max and
  η_m = mass / m_max.
- **Concrete rings (hybrid):** ring height h_ring (default 3.8 m), split into
  n_parts per ring (default 2, adjustable). Output: number of rings, mass per
  part, max part mass. η_m,c = max part mass / m_max. Transport geometry of
  shell parts is not checked (limitation).
- **Crane:** heaviest lift = max(steel segment, concrete part, nacelle, rotor),
  with hook height = hub height + 10 m allowance (assumption).
  η_crane = heaviest lift / crane capacity at that height (user input,
  default 120 t). No manufacturer load charts.

### 5.7 Masses

Steel mass, concrete mass, RNA mass, total. Shown as bars and with a scale
comparison (cars at 1.5 t each).

### 5.8 Design space (sweep)

- Steel: hub height (80–180 m) × base diameter (3.5–8.0 m), 40 × 40 grid. Top
  diameter and the wall-thickness profile are taken from the current variant
  (no automatic sizing; limitation).
- Hybrid: hub height × transition height (20 m to H − 20 m). Concrete base and
  top diameters, wall thicknesses and the steel profile come from the current
  variant; the steel part is stretched or shortened to fill the remaining height.
- Each cell: max η and governing check id. The map colours cells by governing
  check and shades η > 1 as infeasible. The current variant is marked. Clicking
  a cell applies that variant.
- Must run in < 100 ms in the browser (tested with a timing assertion in Node,
  generous threshold).

### 5.9 Presets

`data/presets/generic-{3,5,7}mw.json`, schema:

```json
{
  "schema": 1,
  "id": "generic-5mw",
  "turbine": {
    "ratedPower_W": 0, "rotorDiameter_m": 0, "hubHeight_m": 0,
    "rpmMin": 0, "rpmMax": 0, "ratedWind_mps": 0, "ctRated": 0,
    "massNacelle_kg": 0, "massRotor_kg": 0
  },
  "foundation": { "kPhi_Nm_per_rad": 0 },
  "towers": { "steel": { "segments": [] }, "hybrid": { "concrete": {}, "steel": { "segments": [] } } },
  "sources": [ { "key": "nrel5mw", "title": "", "url": "", "page": "", "fields": [] } ]
}
```

- 3 MW: turbine values from the IEA Wind Task 37 3.4 MW land-based reference
  turbine report.
- 5 MW: turbine values from the NREL 5 MW reference turbine report
  (NREL/TP-500-38060).
- 7 MW: scaled from the 3.4 MW reference: D ∝ √P, constant tip speed (rpm ∝ 1/D),
  masses ∝ D^2.5. The scaling laws are shown on the page.
- Every turbine value has a source key and page reference, filled in during
  implementation from the reports themselves. Tower geometries and k_φ values
  are the author's own concept values and are labelled that way.

## 6. Bilingual setup (DE primary, EN)

- Language from `?lang=de|en`, else `localStorage`, else `de`. The toggle in the
  header updates the URL and `<html lang>`.
- UI strings in `src/i18n/{de,en}.json`, flat keys (`check.freq.label`).
- Explanations, assumptions, plain-language templates, tour, limitations and the
  About page in `content/{de,en}/*.md`. Blocks are keyed by ID with
  `<!-- id: freq.rayleigh -->` markers, so one file can hold many blocks.
- Formulas stored once in `content/formulas.json` (TeX), rendered with KaTeX.
- Templates with placeholders: `"Der Turm schwingt mit {f1} Hz – {verdict}."`.
  Numbers formatted with `Intl.NumberFormat(lang)`.
- Glossary `content/glossary.json` (DE ↔ EN), shown as tooltips on marked terms.
- A test checks that every key and content ID exists in both languages.

## 7. Pages and UI

### 7.1 Landing (`index.html`)

Hero "Wind Design Notebook – Rotor → Turm → Straße" with a tower silhouette next
to Cologne Cathedral (157 m) for scale. Three module cards: Turm active, Rotor
and Straße marked "in Arbeit". Two sentences on what the project is. Links to
the tower module and About.

### 7.2 Tower module (`turm/index.html`), top to bottom

1. **Header verdict:** preset (3/5/7 MW), type (steel/hybrid), a big traffic-light
   verdict with the governing check and η, scale comparisons (height vs.
   cathedral, mass in cars, rotor speed), button "Tour starten".
2. **① Variant:** grouped inputs (turbine, tower geometry, foundation, limits) as
   number field + slider. SVG tower sketch with segment joints coloured by η.
   Result cards (f₁ + Campbell, stress, segments & transport, crane, masses).
   Each card has a plain-language sentence, the value and "Herleitung ▸"
   (formula, assumptions, source, Rayleigh vs. FE). Derivations are open by
   default on desktop and collapsed on mobile. Utilisation table with all η as
   bars.
3. **② Design space:** axis choice, feasibility map, current variant marker,
   click to apply.
4. **③ Comparison:** "Variante merken", up to 3 slots, side by side: total mass,
   steel/concrete mass, number of segments, heaviest lift, max η, governing
   check.
5. **④ Limitations & sources:** each limitation with a one-line reason;
   numbered source list.
6. **Footer:** data sheet (print → PDF via `print.css`), CSV export of the
   utilisation table, GitHub link.

### 7.3 About (`about/index.html`)

What, why, how it's verified (JS Rayleigh vs. independent Python FE), skills
shown, what it doesn't do. Explicit note: personal project, public sources only,
no affiliation with any company.

### 7.4 Guided tour

Four steps, each sets a preset/variant and highlights a section:
1. Why so tall? (wind speed grows with height → yield)
2. Why does it vibrate? (f₁ between 1P and 3P, Campbell diagram)
3. Why doesn't it fit on the road? (steel at large heights → D > 4.3 m)
4. That's why the hybrid tower (concrete below, steel above, design-space map)

### 7.5 URL state

- `?lang=` for the language.
- `#s=<base64url(JSON)>` with `{ v: 1, preset, type, diff: {…}, variants: [...] }`,
  where `diff` only holds values that differ from the preset.
- Unknown or broken state → fall back to the default preset plus a small notice.

### 7.6 Quality

- Invalid inputs (t ≥ D/2, non-positive values, h_tr outside (0, H), n_min ≥ n_max)
  mark the field. Affected results show "—" with the reason in `errors[]`.
  Nothing throws to the console.
- One-column layout below 768 px. Dark/light mode from `prefers-color-scheme`.
- Charts have `<title>`, `aria-label` and a data-table fallback.
- Page weight without CDN libraries < 200 kB.

## 8. Verification and testing

### 8.1 JS (`node --test`, no dependencies)

- Unit: section values against hand calculations. Hand formula vs. Rayleigh for
  a uniform tower (< 1 %). Segment algorithm edge cases (exactly at L_max/m_max,
  single segment, tower shorter than L_max). η at window edges (= 1.0). Empty
  window error. Input validation.
- Fixture comparison: for every case in `verify/fixtures/`, Rayleigh f₁ vs. FE f₁
  ≤ 3 %, masses and base moment ≤ 0.5 %.
- i18n completeness; every `formulaId` used in `src/calc` exists in
  `formulas.json`.
- Links: no `href="/` or `src="/` in HTML (relative paths only).
- Sweep timing assertion.

### 8.2 Python (`verify/`, pytest, pinned numpy/scipy)

- `fe_beam.py`: Euler-Bernoulli beam, Hermite cubic elements, consistent mass
  matrix, rotational spring at the base, point mass at the tip, element
  properties from the same station data. `scipy.linalg.eigh` for the generalised
  eigenproblem.
- `test_fe_beam.py`: uniform cantilever (β₁L = 1.8751), cantilever with tip mass
  (frequency equation), rigid tower on a rotational spring, and mesh convergence.
- `generate_fixtures.py`: reads presets (steel + hybrid) plus a few extra cases,
  writes `verify/fixtures/*.json`. It reimplements geometry, mass and moment
  independently from the JS (no shared code).

### 8.3 Fixture format (shared with the future `verify-rs/`)

```json
{
  "schema": 1,
  "case": "generic-5mw-steel",
  "generator": "python-fe 1.0",
  "inputs": { "…": "SI values, full tower definition" },
  "expected": { "f1_hz": 0, "mass_steel_kg": 0, "mass_concrete_kg": 0, "base_moment_Nm": 0 },
  "tolerance": { "f1_hz": 0.03, "mass_steel_kg": 0.005, "mass_concrete_kg": 0.005, "base_moment_Nm": 0.005 }
}
```

Tolerances are relative.

### 8.4 CI and deployment (`.github/workflows/pages.yml`)

- Pull requests: Node tests and pytest. Plus fixture freshness: regenerate, then
  `git diff --exit-code verify/fixtures`.
- Push to `main`: the same, then deploy with `actions/upload-pages-artifact` and
  `actions/deploy-pages`. The artifact excludes `docs/`, `verify/`, `test/` and
  `.github/`.
- Enabling Pages and the first push happen only after the author's explicit OK.

### 8.5 Manual release check

Phone width, both languages, print the data sheet, the full tour, a shared
variant link opened in a fresh browser.

## 9. Limitations (to appear on the page)

Fatigue (not assessed); shell buckling to EN 1993-1-6 (only D/t plausibility);
flanges and bolts; concrete prestressing, decompression and cracking; transition
piece; foundation design and lateral flexibility; soil-structure interaction
beyond k_φ; RNA rotary inertia; second and higher bending modes; aeroelastic
coupling and damping; extreme loads from DLCs (only a load indicator); no
automatic wall-thickness sizing in the sweep; generic presets, not real products.

## 10. Out of scope for stage 1

Rotor module (BEM), transport module (swept path, bridge clearance), 3D view,
Rust verification (`verify-rs/`, own later stage), cost models, automatic
optimisation.

## 11. Done criteria

- Presets 3/5/7 MW, steel and hybrid, can be evaluated.
- Sections ① to ④, tour, landing page and About page work.
- DE and EN complete.
- JS and Python tests green in CI. Rayleigh vs. FE within 3 % for all presets.
- Site live on GitHub Pages (after the author's OK).
