# Tower Module (Turm) – Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the static, bilingual tower module of Wind Design Notebook: a browser calculator that evaluates steel and hybrid towers for 3/5/7 MW presets as utilisation ratios, verified against an independent Python FE model.

**Architecture:** Pure `// @ts-check` ES modules in `src/calc/` (SI units, no DOM) turn an `Inputs` object into a `Result` object via one entry point `evaluate()`. DOM code in `src/ui/` and hand-built SVG in `src/charts/` render that result. A separate Python FE beam model in `verify/` writes JSON fixtures that the JS tests compare against.

**Tech Stack:** HTML/CSS/native ES modules (no build step), Node 24 `node --test` (no npm dependencies), Python 3.14 + numpy 2.4.2 + scipy 1.18.0 + pytest, KaTeX 0.16.11 and marked 12.0.2 from jsDelivr, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-01-tower-module-design.md` (commit 0d681c8). Read it in full before any task; section numbers below (§x.y) refer to it.

## Global Constraints

- Work on branch `feat/tower-module`, never on `main`. Commit as the configured user (Suavi Yildirim, `345443090+suavi-yildirim@users.noreply.github.com`) with **no** `Co-Authored-By` line.
- Do not push, open a PR or enable GitHub Pages without the author's explicit OK.
- No company names, branding, data or geometries of any turbine or tower manufacturer. Public sources only (NREL/TP-500-38060, IEA Wind Task 37 3.4 MW RWT report). Tower geometries and k_φ are labelled "author's concept values".
- No build step, no npm dependencies. Every JS file in `src/` starts with `// @ts-check`. Root `package.json` holds only `{"private":true,"type":"module","scripts":{"test":"node --test"}}`.
- All internal values SI. Display units: m, mm, t, kN, MN·m, MPa, Hz, rpm.
- All links and fetches relative (site lives under `/wind-design-notebook/`). Module code resolves data with `new URL('../../data/…', import.meta.url)`.
- Material constants: S355 E = 210 GPa, ρ = 7850 kg/m³; C50/60 E_cm = 37 GPa, ρ = 2500 kg/m³, uncracked.
- Defaults (`src/calc/defaults.js`): k_add 1.08 (steel only), N = 100 intervals, margin m 0.10, ρ_air 1.225, α 0.2, c_f 0.7, γ_F 1.35, k_peak 1.5, γ_G 1.35, γ_M1 1.1, g 9.81, L_max 30 m, m_max 80 t, D_transport 4.30 m, h_ring 3.8 m, n_parts 2, crane capacity 120 t, hook allowance 10 m.
- Verdict colours: green η ≤ 0.9, amber 0.9 < η ≤ 1.0, red η > 1.0.
- German primary, English complete. Language: `?lang=` → `localStorage` → `de`.
- Rust is out of scope; fixture format of §8.3 is fixed exactly.
- Page weight without CDN libraries < 200 kB. Layout one column below 768 px. Dark/light via `prefers-color-scheme`.
- Long commands (> ~2 min) run in the background.

## Review Focus

1. **Empty soft-stiff window from real rpm data** (wide variable-speed range, e.g. 1P_max·1.1 ≥ 3P_min·0.9): the frequency check must show an explained error, the rest of the page still renders, `governing` comes from the remaining checks, and nothing shows `NaN`. Test in Task 6.
2. **Broken, old or hand-edited `#s=` hash** (bad base64, wrong `v`, unknown preset, diff path that no longer exists): fall back to the default preset with a notice, never throw. Test in Task 12.
3. **German decimal comma** typed into a field (`4,3`) while `lang=de`: parsed as 4.3, not rejected or read as 43. Test in Task 12.
4. **Wall thickness above the S355 table** (t > 80 mm) or **t ≥ D/2 only at one end of a tapered zone**: field-level error, η shows "—", no silent fallback to 325 MPa. Tests in Tasks 2 and 6.
5. **Hybrid sweep cells where h_tr > H − 20 m** and **hybrid inputs with h_tr at or outside (0, H)**: the cell is marked n/a, not infeasible and not a crash. evaluate returns an error for the input. Tests in Tasks 6 and 7.

---

## File Map

| File | Responsibility |
|---|---|
| `package.json`, `.gitignore` | ESM flag + `npm test` alias; ignore `verify/.venv`, `__pycache__`, `.DS_Store` |
| `src/calc/types.js` | JSDoc typedefs only (`Inputs`, `SteelZone`, `Concrete`, `Station`, `Check`, `CalcError`, `Result`) |
| `src/calc/defaults.js` | `STEEL`, `CONCRETE`, `DEFAULT_LIMITS`, `DEFAULT_ASSUMPTIONS`, `N_INTERVALS` |
| `src/calc/section.js` | Circular hollow section |
| `src/calc/tower.js` | Tower definition → stations; `massBetween` |
| `src/calc/foundation.js` | k_φ validation and base rotation |
| `src/calc/frequency.js` | Hand formula, Rayleigh, bands, window check |
| `src/calc/loads.js` | Thrust, drag, design moment, normal force |
| `src/calc/segments.js` | Steel transport segments, concrete rings |
| `src/calc/crane.js` | Heaviest lift, hook height |
| `src/calc/checks.js` | Check objects, f_y table, verdict |
| `src/calc/evaluate.js` | `inputsFromPreset`, `validateInputs`, `evaluate` |
| `src/calc/sweep.js` | Design-space grid |
| `verify/fe_beam.py`, `verify/test_fe_beam.py` | Python FE + analytic tests |
| `verify/generate_fixtures.py`, `verify/fixtures/*.json` | Independent reference values |
| `data/presets/generic-{3,5,7}mw.json` | Presets with sources |
| `data/fe-reference.json` | FE f₁ per preset case (deployed; `verify/` is not) |
| `src/i18n/{de,en}.json`, `src/i18n/i18n.js` | UI strings, language, number formatting |
| `content/{de,en}/*.md`, `content/formulas.json`, `content/glossary.json` | Explanations, TeX, glossary |
| `src/ui/*.js`, `src/charts/*.js` | Rendering (see Tasks 12–17) |
| `index.html`, `turm/index.html`, `about/index.html`, `assets/css/{site,print}.css` | Pages |
| `test/*.test.js` | node --test suites |
| `.github/workflows/pages.yml` | CI + deploy |

## Shared Types (defined in Task 1, `src/calc/types.js`)

```js
/** @typedef {{ lengthFrac:number, dBot_m:number, dTop_m:number, tBot_m:number, tTop_m:number }} SteelZone */
/** @typedef {{ hTr_m:number, dBot_m:number, dTop_m:number, t_m:number }} Concrete */
/** @typedef {{
 *   presetId:string, type:'steel'|'hybrid',
 *   turbine:{ ratedPower_W:number, rotorDiameter_m:number, hubHeight_m:number, rpmMin:number, rpmMax:number,
 *             ratedWind_mps:number, ctRated:number, massNacelle_kg:number, massRotor_kg:number },
 *   foundation:{ kPhi_Nm_per_rad:number },
 *   steel:{ segments:SteelZone[] },
 *   hybrid:{ concrete:Concrete, steel:{ segments:SteelZone[] } },
 *   limits:{ lMax_m:number, mMax_kg:number, dTransport_m:number, craneCapacity_kg:number,
 *            freqMargin:number, ringHeight_m:number, ringParts:number },
 *   assumptions:{ kAdd:number, rhoAir:number, alpha:number, cf:number, gammaF:number, kPeak:number,
 *                 gammaG:number, gammaM1:number, g:number, hookAllowance_m:number }
 * }} Inputs */
/** @typedef {{ z:number, D:number, t:number, A:number, I:number, W:number, EI:number, mu:number, material:'steel'|'concrete' }} Station */
/** @typedef {{ id:string, eta:number|null, limit:number, demand:number, unit:string, formulaId:string,
 *              assumptionIds:string[], governingInput:string, z_m?:number }} Check */
/** @typedef {{ id:string, field?:string, key:string, params?:Record<string,number|string> }} CalcError */
```

Modelling decisions the spec leaves open (fixed here):
- Tower height H = hub height (hub offset above tower top neglected; listed as limitation `lim.hubOffset`).
- Steel geometry = zones with `lengthFrac` (Σ = 1 ± 1e-6) over the steel length (H for steel, H − h_tr for hybrid). Changing H or h_tr stretches zones. D and t are linear within a zone.
- Discretisation: N = 100 intervals. Hybrid: n_c = max(2, round(N·h_tr/H)) concrete intervals, N − n_c steel intervals, with a **duplicated station at z = h_tr** (concrete below, steel above) so that integrals never mix materials. Integrals use the trapezoidal rule; a zero-length interval contributes 0.
- Python FE and fixture generation reimplement geometry from the preset definition with their own discretisation (200 elements, midpoint properties). They never read JS stations.
- `verify/` is not deployed, so `generate_fixtures.py` also writes `data/fe-reference.json` = `{ "schema":1, "cases": { "<case>": { "f1_hz": … } } }` for the "Rayleigh vs. FE" display.
- Fixture `inputs` = a complete JS `Inputs` object, so `evaluate(fixture.inputs)` runs it directly. `expected.base_moment_Nm` = design moment M_d(0) including γ_F·k_peak.
- Presets may carry an optional `limits` block overriding `DEFAULT_LIMITS` (e.g. crane capacity as a labelled concept assumption); the schema in §5.9 is otherwise unchanged. Each steel/hybrid tower object also carries `"label": "author-concept"`.

---

### Task 1: Scaffold, defaults and section properties

**Files:**
- Create: `package.json`, `.gitignore`, `src/calc/types.js`, `src/calc/defaults.js`, `src/calc/section.js`
- Test: `test/section.test.js`

**Interfaces:**
- Produces: `circularHollow(D:number, t:number) → { A, I, W }`; `STEEL = { E:210e9, rho:7850, fyName:'S355' }`, `CONCRETE = { E:37e9, rho:2500 }`, `N_INTERVALS = 100`, `DEFAULT_LIMITS`, `DEFAULT_ASSUMPTIONS` (keys as in `Inputs`, values from Global Constraints; mMax_kg 80000, craneCapacity_kg 120000).

- [ ] **Step 1:** `git switch -c feat/tower-module`. Commit this plan (`docs: add tower module implementation plan`). Create `package.json` and `.gitignore` as in Global Constraints.
- [ ] **Step 2: Write the failing test** `test/section.test.js`:

```js
test('circularHollow D=4.0 t=0.020 matches hand calc', () => {
  const s = circularHollow(4.0, 0.020);
  assertRel(s.A, 0.250070775, 1e-6);
  assertRel(s.I, 0.4951652, 1e-6);
  assertRel(s.W, 0.2475826, 1e-6);
});
test('solid section when t = D/2', () => assertRel(circularHollow(2, 1).I, Math.PI / 4, 1e-12));
```
Put `assertRel(actual, expected, rel)` in `test/helpers.js` (shared by all suites).
- [ ] **Step 3:** Run `node --test test/section.test.js` → FAIL (module not found).
- [ ] **Step 4:** Implement `section.js`, `defaults.js`, `types.js` (exact formulas §5.1).
- [ ] **Step 5:** Run `node --test` → PASS. Commit `feat(calc): scaffold, defaults and hollow section`.

### Task 2: Tower discretisation and foundation

**Files:** Create `src/calc/tower.js`, `src/calc/foundation.js`. Test `test/tower.test.js`, `test/foundation.test.js`.

**Interfaces:**
- Consumes: `circularHollow`, `STEEL`, `CONCRETE`, `N_INTERVALS`.
- Produces:
  - `buildStations(inputs:Inputs) → { H:number, stations:Station[], errors:CalcError[] }` (stations ordered by z from 0 to H; empty with errors on invalid geometry).
  - `massBetween(stations:Station[], z0:number, z1:number, material?:'steel'|'concrete') → number` (kg, linear interpolation of μ inside intervals).
  - `towerMasses(stations) → { steel_kg, concrete_kg }`.
  - `validateFoundation(kPhi) → CalcError[]`; `baseRotation(M_Nm, kPhi) → rad`.

- [ ] **Step 1: Write failing tests:**
  - `uniform steel tower: 101 stations, z[0]=0, z[100]=H, μ = 7850·A·1.08 at every station`.
  - `two zones lengthFrac 0.5/0.5: D continuous at the joint, linear inside each zone`.
  - `hybrid H=150, hTr=60: concrete intervals = 40, one duplicated station at z=60 with material concrete then steel, length 102`.
  - `concrete μ has no k_add: μ = 2500·A`.
  - `massBetween over whole tower equals towerMasses total; uniform tower mass = μ·H (rel 1e-9)`.
  - `errors (no throw)`: lengthFrac sum 0.9 → `error.geom.fracSum`; t ≥ D/2 at a zone top only → `error.geom.tTooLarge` with `field: 'steel.segments.0.tTop_m'`; non-positive D → `error.geom.nonPositive`; hybrid hTr = 0 and hTr = H → `error.geom.hTrRange`.
  - `validateFoundation(0)` and `(-1)` → `error.foundation.kPhi`; `baseRotation(1e8, 1e11) = 1e-3`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Field paths in errors use the dotted `Inputs` path (they drive field highlighting in Task 12).
- [ ] **Step 4:** Run → PASS. Commit `feat(calc): tower stations and foundation spring`.

### Task 3: Natural frequency and excitation bands

**Files:** Create `src/calc/frequency.js`. Test `test/frequency.test.js`.

**Interfaces:**
- Consumes: stations from `buildStations`.
- Produces:
  - `handFormula({ H, EI, kPhi, mRna, mTower }) → f_hz` (§5.3; EI = mean of station EI, documented).
  - `rayleigh(stations, { kPhi, mRna }) → { f1_hz, w:number[] }` (unit tip load, curvature F(H−z)/EI integrated twice by trapezoid, θ₀ = F·H/k_φ, quotient exactly as §5.3; numerator may use ∫M²/EI dz, which equals ∫EI·w''² dz).
  - `bands(rpmMin, rpmMax, margin) → { p1:[number,number], p3:[number,number], window:[number,number]|null }`.
  - `freqEta(f1, bands) → number|null` (null when window is null).

- [ ] **Step 1: Write failing tests** (uniform tower D=4, t=0.02, H=100, k_add 1.08, M_RNA = 100 t, k_φ = 1e15):
  - `hand formula = 0.228850 Hz (rel 1e-4)`.
  - `rayleigh within 1 % of hand formula for the uniform tower`.
  - `soft foundation lowers f1`: k_φ = 5e10 gives f1 < f1 at 1e15.
  - `bands(6.9, 12.1, 0.1)`: p1 = [0.115, 0.201667], p3 = [0.345, 0.605], window = [0.221833, 0.3105].
  - `freqEta at window edges = 1.0` (both edges, abs 1e-12) and `0.853` at f1 = 0.26.
  - `empty window`: `bands(3.8, 11.75, 0.1).window === null` and `freqEta(...) === null`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(calc): hand formula, Rayleigh f1 and 1P/3P bands`.

### Task 4: Loads

**Files:** Create `src/calc/loads.js`. Test `test/loads.test.js`.

**Interfaces:**
- Produces:
  - `thrust({ rhoAir, rotorDiameter_m, ctRated, ratedWind_mps }) → N`.
  - `momentLine(stations, { thrust_N, mRna_kg, ratedWind_mps, assumptions }) → { z:number[], Md:number[], N:number[], baseMoment_Nm:number }` (arrays aligned with stations; M_d and N per §5.5; drag integral by trapezoid over stations above z).

- [ ] **Step 1: Write failing tests:**
  - `thrust 126 m / CT 0.8 / 11.4 m/s = 7.9404e5 N (rel 1e-3)`.
  - `no drag (cf = 0): Md(0) = 1.35·1.5·F_T·H (rel 1e-9), Md(H) = 0`.
  - `with drag Md(0) > no-drag Md(0) and Md decreasing with z`.
  - `N(H) = M_RNA·g·γ_G; N(0) = (M_RNA + tower mass)·g·γ_G (rel 1e-9)`.
- [ ] **Step 2–4:** FAIL → implement → PASS. Commit `feat(calc): thrust, drag and design moment line`.

### Task 5: Segments and crane

**Files:** Create `src/calc/segments.js`, `src/calc/crane.js`. Test `test/segments.test.js`, `test/crane.test.js`.

**Interfaces:**
- Produces:
  - `splitSteel(stations, { lMax_m, mMax_kg }) → { zBot, zTop, length_m, dMax_m, mass_kg }[]` (top → bottom greedy over steel stations, §5.6; a segment closes when adding the next interval would exceed L_max **or** m_max; equality is allowed; a single interval exceeding a limit forms its own segment). Returned ordered bottom → top.
  - `concreteRings(stations, { hTr_m, ringHeight_m, ringParts }) → { count, rings:{ zBot, zTop, mass_kg }[], partMass_kg:number[], maxPartMass_kg }` (count = ceil(h_tr/h_ring), last ring shorter, mass via `massBetween`).
  - `heaviestLift({ steelSegments, concreteMaxPart_kg, massNacelle_kg, massRotor_kg, hubHeight_m, hookAllowance_m }) → { mass_kg, source:'steelSegment'|'concretePart'|'nacelle'|'rotor', hookHeight_m }`.

- [ ] **Step 1: Write failing tests** with synthetic stations (1 m spacing, D 4 m, constant μ):
  - `H=90, μ=1000, Lmax 30 → three segments of exactly 30 m`.
  - `H=95 → 30, 30, 30 from the top and 5 m at the bottom`.
  - `μ=4000, mMax 80 t → 20 m segments (exactly at m_max)`.
  - `H=20 < Lmax → one segment`.
  - `rings: hTr 60, h_ring 3.8 → count 16, last ring 3.0 m; ringParts 2 → partMass = ring mass / 2`.
  - `heaviest lift picks nacelle when it is heaviest; hookHeight = hub + 10`.
- [ ] **Step 2–4:** FAIL → implement → PASS. Commit `feat(calc): transport segments, concrete rings, crane lift`.

### Task 6: Checks and `evaluate`

**Files:** Create `src/calc/checks.js`, `src/calc/evaluate.js`. Test `test/checks.test.js`, `test/evaluate.test.js`.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces:
  - `fyS355(t_m) → Pa | null` (≤16 mm 355, ≤40 345, ≤63 335, ≤80 325 MPa; > 80 mm → null).
  - `verdict(eta:number|null) → 'green'|'amber'|'red'|'none'`.
  - `buildChecks(parts) → Check[]` with ids in this order: `freq`, `stress`, `transport.d`, `transport.l`, `transport.m`, `concrete.m` (hybrid only), `crane`. `formulaId`s: `check.freq`, `check.stress`, `check.transport`, `check.transport`, `check.transport`, `check.concrete`, `check.crane`.
  - `inputsFromPreset(preset, type:'steel'|'hybrid') → Inputs` (merges `DEFAULT_LIMITS` ← `preset.limits`, `DEFAULT_ASSUMPTIONS`).
  - `validateInputs(inputs) → CalcError[]` (§7.6 list + n_min ≥ n_max → `error.turbine.rpm`).
  - `evaluate(inputs) → Result`, where `Result = { inputs, tower:{ H, type, stations }, f1:{ rayleigh_hz, hand_hz, formulaId:'f1.rayleigh', assumptionIds }, bands, loads, stress:{ etaMax, z_m }, dt:{ min, max, hint:'high'|'low'|null } (D/t plausibility, hint when > 300 or < 80, no η), segments:{ steel, rings }, crane, masses:{ steel_kg, concrete_kg, rna_kg, total_kg }, checks, governing:Check|null, verdict, errors }`. Never throws; affected parts are `null` when their inputs are invalid.

- [ ] **Step 1: Write failing tests:**
  - `fyS355`: 0.016 → 355e6, 0.0161 → 345e6, 0.040 → 345e6, 0.063 → 335e6, 0.080 → 325e6, 0.081 → null.
  - `verdict`: 0.9 → green, 0.9001 → amber, 1.0 → amber, 1.0001 → red, null → none.
  - `governing = check with max η; null η ignored`.
  - `stress check reports max η over steel stations only and its height` (hybrid fixture input: no concrete z in `stress.z_m`).
  - **Review Focus 1:** `empty window: freq check η null, errors contains {id:'freq', key:'error.freq.emptyWindow'}, governing from other checks, JSON.stringify(result) contains no "NaN"/"null" where a number is expected`.
  - **Review Focus 4:** `t = 0.085 m → stress η null, error key error.stress.tOutsideTable with field path`.
  - **Review Focus 5:** `hybrid hTr ≥ H → errors contain error.geom.hTrRange, evaluate does not throw`.
  - `D/t hint: uniform D 4 m, t 12 mm (D/t 333) → dt.hint 'high'; t 60 mm (D/t 67) → 'low'; D/t 200 → null`.
  - `wrapping every invalid case from §7.6 in evaluate never throws` (table-driven).
- [ ] **Step 2–4:** FAIL → implement → PASS. Commit `feat(calc): checks, verdict and evaluate entry point`.

### Task 7: Design-space sweep

**Files:** Create `src/calc/sweep.js`. Test `test/sweep.test.js`.

**Interfaces:**
- Produces: `sweep(inputs, { kind:'steel'|'hybrid', nx=40, ny=40 }) → { x:{ key, values:number[] }, y:{ key, values:number[] }, eta:Float64Array, governing:(string|null)[], valid:Uint8Array, current:{ x:number, y:number } }`.
  - Steel: x = `turbine.hubHeight_m` 80…180, y = base diameter 3.5…8.0 (sets `segments[0].dBot_m` only).
  - Hybrid: x = hub height 80…180, y = `hybrid.concrete.hTr_m` 20…160; cells with h_tr > H − 20 have `valid = 0`, η NaN, governing null (Review Focus 5).
  - `applyCell(inputs, kind, ix, iy) → Inputs` (used by the map click).

- [ ] **Step 1: Write failing tests:** grid length 1600; `applyCell` sets the two values; hybrid cell (H=80, hTr=100) is invalid; **timing:** after one warm-up call, `sweep` for the 5 MW steel preset inputs takes < 250 ms in Node (browser target < 100 ms is checked in Task 19). Uses a hand-made Inputs object in `test/fixtures-inputs.js` until presets exist.
- [ ] **Step 2–4:** FAIL → implement (reuse `evaluate`; profile only if the timing test fails) → PASS. Commit `feat(calc): design-space sweep`.

### Task 8: Python FE beam model

**Files:** Create `verify/requirements.txt` (`numpy==2.4.2`, `scipy==1.18.0`, `pytest==<installed version>`), `verify/fe_beam.py`, `verify/test_fe_beam.py`.

**Interfaces:**
- Produces: `natural_frequencies(z_nodes, EI_el, mu_el, k_phi, m_tip, n_modes=3) -> np.ndarray` (Hz, ascending). Euler-Bernoulli Hermite cubic elements, consistent mass matrix, rotational spring on the base rotation DOF, base translation fixed, tip point mass on the top translation DOF, `scipy.linalg.eigh(K, M)`.

- [ ] **Step 1:** `python3 -m venv verify/.venv && verify/.venv/bin/pip install -r verify/requirements.txt` (pytest pinned to the installed version via `pip freeze`).
- [ ] **Step 2: Write failing tests:**
  - `test_uniform_cantilever`: f1 = (1.8751²/2π)·√(EI/(μL⁴)) within 0.1 % (k_φ = 1e15, 50 elements).
  - `test_tip_mass`: root of `1 + cos βL·cosh βL + (M/(μL))·βL·(cos βL·sinh βL − sin βL·cosh βL) = 0` via `brentq`, M/(μL) = 0.5, within 0.1 %.
  - `test_rigid_on_spring`: EI 1e20, ω² = k_φ / (∫μz² dz + M·H²) within 0.5 %.
  - `test_mesh_convergence`: |f1(50) − f1(200)| / f1(200) < 1e-3.
- [ ] **Step 3:** `verify/.venv/bin/pytest verify -q` → FAIL. **Step 4:** Implement → PASS.
- [ ] **Step 5:** Commit `feat(verify): Euler-Bernoulli FE beam model with analytic tests`.

### Task 9: Presets with sources

**Files:** Create `data/presets/generic-3mw.json`, `generic-5mw.json`, `generic-7mw.json`, `data/presets/README.md` (short). Test `test/presets.test.js`.

**Interfaces:**
- Produces: preset JSON per §5.9 schema + optional `limits`. Every `turbine` field appears in exactly one `sources[].fields` entry, with `page` filled. Derived values (e.g. C_T from rotor thrust at rated) carry `"derived": "<how>"` in that source entry. Tower objects carry `"label": "author-concept"`.

- [ ] **Step 1:** Fetch NREL/TP-500-38060 (`https://www.nrel.gov/docs/fy09osti/38060.pdf`) and the IEA Wind Task 37 RWT report with the 3.4 MW land-based turbine (NREL/TP-5000-73492, `https://www.nrel.gov/docs/fy19osti/73492.pdf`) into the scratchpad. If fetching needs a file download in the browser, ask the author first. Read the values and page numbers from the reports themselves, never from memory.
- [ ] **Step 2:** **Decision point:** if the sourced rpm range gives an empty soft-stiff window (1P_max·1.1 ≥ 3P_min·0.9) for the 3.4 MW turbine, stop and ask the author how to present it. Do not alter source values.
- [ ] **Step 3:** 7 MW: scale from 3.4 MW per §5.9 (D ∝ √P, rpm ∝ 1/D, masses ∝ D^2.5, rated wind and C_T kept). Record the laws in the preset (`"scaling": {...}`). Hub height is an author's concept value.
- [ ] **Step 4:** Size author's concept geometries with a scratch script that calls `evaluate`: 3 and 5 MW steel and hybrid pass (η ≤ 1). For the 7 MW steel tower at its concept hub height, transport diameter governs (D_base > 4.30 m, red), and the 7 MW hybrid passes. That carries the §1 success-criterion-2 story. k_φ concept values in the range 5e10–2e11 N·m/rad, labelled as such.
- [ ] **Step 5: Write tests** `test/presets.test.js`: schema 1; every turbine field covered by a source with non-empty `page`; `inputsFromPreset` then `evaluate` with no errors for all 6 cases; the 5 MW steel η ≤ 1; the 7 MW steel governing = `transport.d`; no manufacturer names (test greps preset and content files against a small deny-list in the test, e.g. common OEM names).
- [ ] **Step 6:** Run → PASS. Commit `feat(data): 3/5/7 MW generic presets with public sources`.

### Task 10: Fixtures and JS-vs-FE comparison

**Files:** Create `verify/generate_fixtures.py`, `verify/fixtures/*.json`, `data/fe-reference.json`. Test `test/fixtures.test.js`.

**Interfaces:**
- Consumes: `natural_frequencies`, presets.
- Produces: one fixture per case `generic-{3,5,7}mw-{steel,hybrid}` + `uniform-steel` + `soft-foundation-5mw-steel` (k_φ = 2e10), in exact §8.3 format, `generator: "python-fe 1.0"`. Python re-implements geometry, k_add, mass and M_d(0) on its own (200 elements; moment by `scipy.integrate.quad` or a 2000-point grid). Numbers rounded to 6 significant digits; JSON `indent=2, sort_keys=True`, trailing newline, so regeneration is byte-stable.

- [ ] **Step 1:** Write `generate_fixtures.py` (`python verify/generate_fixtures.py` writes all files) and run it.
- [ ] **Step 2: Write test** `test/fixtures.test.js`: for each `verify/fixtures/*.json`: `evaluate(f.inputs)` and compare `f1.rayleigh_hz`, `masses.steel_kg`, `masses.concrete_kg`, `loads.baseMoment_Nm` with relative tolerances from `f.tolerance` (an expected 0 must match exactly 0); also assert every key of `data/fe-reference.json` has a fixture with the same f1.
- [ ] **Step 3:** Run `node --test` and `pytest`. If any Rayleigh–FE deviation exceeds 3 %, use superpowers:systematic-debugging. **Never widen the tolerance.**
- [ ] **Step 4:** Regenerate and confirm `git diff --exit-code verify/fixtures data/fe-reference.json` is clean. Commit `feat(verify): FE fixtures and JS cross-check`.

### Task 11: i18n core and content

**Files:** Create `src/i18n/i18n.js`, `src/i18n/de.json`, `src/i18n/en.json`, `content/formulas.json`, `content/glossary.json`, `content/{de,en}/explain.md`, `assumptions.md`, `limitations.md`, `tour.md`, `about.md`, `sources.md`. Test `test/i18n.test.js`.

**Interfaces:**
- Produces:
  - `resolveLang(search:string, stored:string|null) → 'de'|'en'` (unknown → `de`).
  - `createI18n(lang, strings) → { lang, t(key, params?) → string, num(x, digits) → string, unit(x, unitKey) → string }` (`{name}` placeholder fill; missing key returns the key and warns once; `Intl.NumberFormat(lang)`).
  - `parseBlocks(md:string) → Map<id, markdown>` splitting on `<!-- id: some.id -->`.
  - Formula IDs (TeX in `formulas.json`): `section.A`, `section.I`, `section.W`, `f1.hand`, `f1.rayleigh`, `bands.window`, `check.freq`, `load.thrust`, `load.drag`, `load.moment`, `load.normal`, `check.stress`, `check.transport`, `check.concrete`, `check.crane`, `scaling.7mw`.
  - Limitation block IDs `lim.*`: one per §9 item + `lim.hubOffset`, each with a one-line reason.

- [ ] **Step 1: Write failing tests:** de/en key sets equal; content block IDs equal per file in both languages; every `formulaId: '…'` / `formulaId: "…"` literal found by regex in `src/calc/*.js` exists in `formulas.json`; every `key: 'error.…'` used in `src/calc` exists in both string files; `resolveLang('?lang=en', 'de') = 'en'`, `('?lang=fr', null) = 'de'`, `('', 'en') = 'en'`; `num(1234.5, 1)` = `1.234,5` (de) and `1,234.5` (en).
- [ ] **Step 2–4:** FAIL → write `i18n.js` and full DE + EN content (DE first, sentence-case, plain language layer for verdict templates such as `verdict.sentence = "Der Turm schwingt mit {f1} Hz – {verdict}."`) → PASS.
- [ ] **Step 5:** Commit `feat(i18n): DE/EN strings, content blocks, formulas and glossary`.

### Task 12: Tower page shell, inputs and URL state

**Files:** Create `turm/index.html`, `assets/css/site.css`, `src/ui/app.js`, `src/ui/inputs.js`, `src/ui/state.js`, `src/ui/explain.js`. Test `test/state.test.js`, `test/inputs.test.js`, `test/explain.test.js`.

**Interfaces:**
- Consumes: `evaluate`, `inputsFromPreset`, `createI18n`, `resolveLang`.
- Produces:
  - `state.js`: `encodeState(obj) → string` (base64url JSON), `decodeState(hash) → { ok:true, state } | { ok:false, reason }`, `diffInputs(base, current) → Record<dottedPath, number|string>`, `applyDiff(base, diff) → { inputs, unknownPaths:string[] }`. State shape `{ v:1, preset, type, diff, variants:[{ name, preset, type, diff }] }`.
  - `inputs.js`: `FIELDS: { path, group:'turbine'|'geometry'|'foundation'|'limits'|'assumptions', unit, toSI, fromSI, min, max, step }[]`, `parseNumber(str, lang) → number|NaN`, `renderInputs(root, inputs, i18n, onChange)`, `markErrors(root, errors)`.
  - `explain.js`: `verdictSentence(result, i18n)`, `cardSentence(checkId, result, i18n)`, `scaleComparisons(result, i18n)` (height vs. Cologne Cathedral 157 m, mass in cars at 1.5 t, rotor rpm).
  - `app.js`: `start()`: load preset JSON + i18n + content, decode hash, render, recalc on `input` throttled by `requestAnimationFrame`, write `#s=` with `history.replaceState`.
  - Page section ids (used by tour and print): `#verdict`, `#variant`, `#design-space`, `#compare`, `#limits`.

- [ ] **Step 1: Write failing tests:**
  - `encode → decode round trip`; `diffInputs` only holds changed paths; `applyDiff` round trip reproduces the inputs.
  - **Review Focus 2:** `decodeState` on `'#s=%%%'`, `'#s=' + b64('{"v":2}')`, unknown preset id → `ok:false` with reason; `applyDiff` with `'steel.segments.9.dBot_m'` → path reported in `unknownPaths`, inputs unchanged.
  - **Review Focus 3:** `parseNumber('4,3','de') = 4.3`, `parseNumber('4.3','en') = 4.3`, `parseNumber('1.234,5','de') = 1234.5`, `parseNumber('abc','de')` is NaN.
  - `verdictSentence` for a green 5 MW result contains the formatted f₁ and the governing check label in both languages.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. HTML: header with preset select (3/5/7 MW), type toggle (steel/hybrid), language toggle, verdict block, "Tour starten" button; inputs as number field + range slider pairs; no inline event handlers.
- [ ] **Step 4:** Run tests → PASS. Serve with `python3 -m http.server 8000` and load `http://localhost:8000/turm/` once. The console must stay clean, and the verdict must update when the hub height slider moves. Commit `feat(ui): tower page shell, inputs, URL state, plain-language verdict`.

### Task 13: Result cards, derivations and charts

**Files:** Create `src/charts/tower-sketch.js`, `src/charts/campbell.js`, `src/charts/utilisation-bars.js`, `src/ui/cards.js`, `src/ui/katex.js`. Test `test/charts.test.js`.

**Interfaces:**
- Produces (each chart returns an `SVGSVGElement` string builder that is pure and Node-testable, plus a DOM mount helper):
  - `towerSketchSvg(result, i18n) → string` (outline from stations; steel joints coloured by `verdict` of the segment's own worst η; concrete hatched; height scale).
  - `campbellSvg(result, i18n) → string` (§5.4: x rpm 0…1.2·n_max, 1P/3P lines, shaded operating range, margin bands, f₁ line).
  - `utilisationBarsSvg(checks, i18n) → string` (governing bar highlighted, η = 1 line).
  - Every SVG has `<title>`, `role="img"`, `aria-label`, and a sibling `<table class="sr-data">` fallback built by `dataTable(rows)`.
  - `cards.js`: `renderCards(root, result, i18n, content)` – cards f₁ + Campbell (hand formula shown next to Rayleigh), stress (with D/t hint), segments & transport, crane, masses (bars steel/concrete/RNA + cars at 1.5 t). Each card has a sentence, the value, and `<details class="derivation">` (formula via KaTeX, assumptions, source, and for presets with an empty diff "Rayleigh vs. FE" from `data/fe-reference.json` with the deviation in %, else the note `fe.noReference`). `open` on desktop (≥ 768 px), closed on mobile. A utilisation table with all η.
  - `katex.js`: lazy-imports `https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.mjs` (+ CSS link in HTML). The `$…$` text fallback is shown if loading fails.

- [ ] **Step 1: Write failing tests:** each builder returns a string containing `<title>`, `aria-label`, no `NaN`; the governing check's bar has class `governing`; Campbell contains one `f1` line at the expected y for a known result; tower sketch for hybrid contains a `concrete` group.
- [ ] **Step 2–4:** FAIL → implement → PASS; check in the browser that the cards render in both languages. Commit `feat(ui): result cards, derivations, SVG charts`.

### Task 14: ② Design space

**Files:** Create `src/charts/feasibility-map.js`, `src/ui/design-space.js`. Test `test/feasibility-map.test.js`.

**Interfaces:**
- Consumes: `sweep`, `applyCell`.
- Produces: `feasibilityMapSvg(sweepResult, i18n) → string` (cells coloured by governing check id from a fixed 7-colour categorical palette that works in light and dark; η > 1 shaded darker + hatch; invalid cells neutral "n/a"; current variant marked; legend; each cell `data-ix`/`data-iy`). `mountDesignSpace(root, getInputs, onApply, i18n)`: axis/kind choice follows the current type; the sweep is recomputed on input changes (debounced 150 ms); a click applies the cell via `onApply(applyCell(...))`.

- [ ] **Step 1: Write failing tests:** 1600 `<rect>` cells for 40×40; invalid cell has class `na`; marker present at `current`; legend lists only check ids that occur.
- [ ] **Step 2–4:** FAIL → implement → PASS; browser check: clicking a cell updates inputs, verdict and URL. Commit `feat(ui): design-space feasibility map`.

### Task 15: ③ Comparison and ④ Limitations & sources

**Files:** Create `src/ui/variants.js`, `src/ui/limits.js`. Test `test/variants.test.js`.

**Interfaces:**
- Produces: `addVariant(list, entry) → list` (max 3; a 4th replaces the oldest and returns `{ list, replaced:true }`), `removeVariant(list, i)`, `compareRows(results) → { key, values:(number|string)[] }[]` with rows: total mass, steel mass, concrete mass, number of segments, heaviest lift, max η, governing check. `renderCompare(root, …)`, `renderLimits(root, content, preset, i18n)` (all `lim.*` blocks; numbered source list from the preset `sources` + fixed project sources NREL/IEA/IEC 61400-1/EN 1993-1-6).
- [ ] **Step 1: Write failing tests:** max 3 slots; `compareRows` row order and values for two known results; variants survive `encodeState`/`decodeState`.
- [ ] **Step 2–4:** FAIL → implement → PASS. Commit `feat(ui): variant comparison, limitations and sources`.

### Task 16: Landing, About and guided tour

**Files:** Create `index.html`, `about/index.html`, `src/ui/tour.js`, `src/ui/page-common.js` (header, language toggle, glossary tooltips shared by all pages). Test `test/tour.test.js`.

**Interfaces:**
- Produces: `TOUR_STEPS = [{ id:'tour.1', preset:'generic-5mw', type:'steel', target:'#verdict' }, { id:'tour.2', preset:'generic-5mw', type:'steel', target:'#variant .card-freq' }, { id:'tour.3', preset:'generic-7mw', type:'steel', target:'#variant .card-transport' }, { id:'tour.4', preset:'generic-7mw', type:'hybrid', target:'#design-space' }]` (§7.4). `startTour(app)`: overlay with back/next/close, Esc closes, focus moves to the dialog, text from `content/<lang>/tour.md`.
  - Landing (§7.1): hero with a simple SVG tower silhouette next to a generic cathedral silhouette labelled Kölner Dom 157 m; three module cards (Turm active, Rotor and Straße "in Arbeit"); two sentences; links to `turm/` and `about/`.
  - About (§7.3) from `content/<lang>/about.md`, including the explicit "personal project, public sources only, no affiliation with any company" note.
- [ ] **Step 1: Write failing tests:** 4 steps; every step's `id` exists in both `tour.md` files; every preset id exists in `data/presets/`.
- [ ] **Step 2–4:** FAIL → implement → PASS; browser: tour runs through all 4 steps in DE and EN. Commit `feat(ui): landing page, about page, guided tour`.

### Task 17: Print data sheet, CSV export, site-wide static tests

**Files:** Create `src/ui/export.js`, `assets/css/print.css`. Test `test/export.test.js`, `test/site.test.js`.

**Interfaces:**
- Produces: `utilisationCsv(result, i18n) → string` (header `id;label;eta;demand;limit;unit` for DE with `;` and decimal comma, `,` and decimal point for EN; UTF-8 BOM); `downloadText(name, text)`; the print button calls `window.print()`; `print.css` hides inputs/map/tour, shows the verdict, cards with derivations open, utilisation table, limitations and sources on A4.
- [ ] **Step 1: Write failing tests:**
  - CSV: one row per check, governing row first-class marked, no `NaN`, DE uses `;`.
  - `site.test.js`: no `href="/` or `src="/` in any `*.html`; every relative `href`/`src` in HTML points at an existing file; total bytes of deployable files (everything except `docs/`, `verify/`, `test/`, `.github/`, `node_modules`) < 200 000.
- [ ] **Step 2–4:** FAIL → implement → PASS. Commit `feat(ui): print data sheet and CSV export`.

### Task 18: CI workflow

**Files:** Create `.github/workflows/pages.yml`.

**Interfaces:**
- Job `test` (pull_request + push to main): checkout@v4, setup-node@v4 (24), setup-python@v5 (3.14), `pip install -r verify/requirements.txt`, `pytest verify -q`, `node --test`, `python verify/generate_fixtures.py && git diff --exit-code verify/fixtures data/fe-reference.json`.
- Job `deploy` (push to main only, `needs: test`, permissions `pages: write`, `id-token: write`, environment `github-pages`): copy the site into `_site/` excluding `docs/ verify/ test/ .github/ package.json`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` (path `_site`), `actions/deploy-pages@v4`.
- [ ] **Step 1:** Write the workflow. Check it locally: YAML parses (`python3 -c "import yaml…"` if PyYAML is available, else `node -e` with a minimal check), and run the copy step in the scratchpad to confirm `_site/` holds only deployable files.
- [ ] **Step 2:** Commit `ci: tests, fixture freshness and Pages deploy`. Nothing is pushed.

### Task 19: Final verification (spec §11, §8.5)

- [ ] **Step 1:** Run `node --test` and `verify/.venv/bin/pytest verify -q`, both green. Regenerate fixtures; the diff is clean. Print the Rayleigh vs. FE deviation table for all 6 preset cases (all ≤ 3 %).
- [ ] **Step 2:** `python3 -m http.server 8000` (background). In the built-in browser at 375×812 and desktop width, in both DE and EN: landing → Turm → all 6 preset/type combinations → change inputs → design-space click → save 3 variants → the full tour → open the print preview → CSV download (ask before downloading) → reload a copied `#s=` link in a new tab → the console stays clean. Measure the sweep time in the page (`performance.now`), < 100 ms.
- [ ] **Step 3:** Use superpowers:verification-before-completion, then superpowers:finishing-a-development-branch. Push, PR or Pages only after the author's OK.
