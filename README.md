# Wind Design Notebook

[![Tests and Pages](https://github.com/suavi-yildirim/wind-design-notebook/actions/workflows/pages.yml/badge.svg)](https://github.com/suavi-yildirim/wind-design-notebook/actions/workflows/pages.yml)

**Live: <https://suavi-yildirim.github.io/wind-design-notebook/>** · Deutsch und English

A public engineering notebook about wind turbine design. It follows one turbine
through three modules – **Rotor → Turm (tower) → Straße (road)** – and every number
on the page shows its formula, its assumptions and its source.

| Module | Status |
|---|---|
| **Turm** – tower calculator | live |
| Rotor – blade element momentum | in progress |
| Straße – swept paths, bridge clearance | in progress |

> Personal learning project. Public sources only. No affiliation with any company,
> and no data, geometries or brands of any manufacturer. Tower geometries are the
> author's own concept values.

## The tower module

Pick a generic 3, 5 or 7 MW turbine, choose a **tubular steel** or **hybrid**
(concrete below, steel above) tower, and change hub height, diameters, wall
thickness or foundation stiffness. Every check updates immediately as a
utilisation **η = demand / limit**, and the largest η governs the verdict
(green ≤ 0.9 < amber ≤ 1.0 < red).

| Check | What it compares |
|---|---|
| Natural frequency | f₁ (Rayleigh) against the soft-stiff window between 1P and 3P, with margin |
| Stress (load indicator) | σ = N/A + M/W in the steel against f_y(t)/γ_M1 for S355 |
| Transport | segment diameter (4.30 m), length (30 m) and mass (80 t) |
| Concrete parts | heaviest precast ring part against the transport mass |
| Crane | heaviest lift at hub height + 10 m against crane capacity |

The page also has a **design-space map** (1,600 variants: hub height × base diameter
or transition height, coloured by the governing check), a **variant comparison**,
a **guided tour** for non-engineers, a printable data sheet, CSV export and
shareable links (the whole state lives in the URL).

### Presets and sources

| Preset | Turbine data |
|---|---|
| `generic-3mw` | IEA Wind TCP Task 37 3.4 MW land-based reference turbine, NREL/TP-5000-73492 |
| `generic-5mw` | NREL 5 MW reference turbine, NREL/TP-500-38060 |
| `generic-7mw` | scaled from the 3.4 MW turbine: D ∝ √P, rpm ∝ 1/D, masses ∝ D^2.5 |

Every turbine value carries its report page in `data/presets/*.json`. Values that
are derived or assumed (e.g. the 3.4 MW thrust coefficient) say so.

### Limitations

This is not a design tool. It does not assess fatigue, shell buckling (only a D/t
plausibility hint), flanges and bolts, concrete prestressing and cracking,
foundation design, higher modes, aeroelastic coupling or extreme loads from design
load cases – the stress check is a load indicator. Wide variable-speed ranges
(3.4 and 7 MW) leave no 1P/3P window; the page reports that instead of an η and
warns when f₁ lies inside an excitation band. The full list is in section ④ of
the tower page.

## How it is verified

The natural frequency in the browser (Rayleigh quotient with the static deflection
line) is checked against an **independent finite element model in Python**
(`verify/`: Euler–Bernoulli beam, Hermite elements, consistent mass matrix,
rotational base spring, tip mass, `scipy.linalg.eigh`). The FE model shares no code
with the JavaScript; it is tested against analytical solutions (cantilever, tip
mass, rigid tower on a spring, mesh convergence) and writes reference fixtures that
the JavaScript tests compare against:

- Rayleigh vs. FE: 0.03–0.15 % for all preset cases (criterion ≤ 3 %)
- masses and design base moment: ≤ 0.5 %

The fixture format in `verify/fixtures/` is shared with a planned third
implementation in Rust (`verify-rs/`).

## Run it locally

No build step and no npm dependencies – the site is plain HTML, CSS and ES modules.
Data and content are fetched, so it needs a web server (not `file://`):

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/turm/>.

### Tests

Node 24 (built-in test runner):

```bash
node --test
```

Python FE model and fixtures (Python 3.14):

```bash
python3 -m venv verify/.venv
```

```bash
verify/.venv/bin/pip install -r verify/requirements.txt
```

```bash
verify/.venv/bin/pytest verify -q
```

After changing a preset or the FE model, regenerate the fixtures and check them:

```bash
verify/.venv/bin/python verify/generate_fixtures.py
```

```bash
verify/.venv/bin/python verify/generate_fixtures.py --check
```

## Repository layout

```
index.html, turm/, about/   pages
src/calc/                   calculation core: pure functions, SI units, no DOM
src/ui/, src/charts/        page logic and hand-built SVG charts
src/i18n/, content/         UI strings and explanations (de, en), formulas, glossary
data/presets/               turbine presets with source references
verify/                     Python FE model, its tests, fixtures
test/                       node --test suites
docs/superpowers/           design spec and implementation plan
.github/workflows/          tests on every PR; deploy to Pages from main
```

KaTeX and marked are loaded from a CDN at pinned versions. GitHub Pages is built by
the workflow: tests first, then only the site files are published (`docs/`,
`verify/`, `test/` and `.github/` stay out).

## Kurzfassung (Deutsch)

Ein öffentliches Notizbuch zur Auslegung von Windenergieanlagen. Das fertige
**Turm-Modul** bewertet Stahl- und Hybridtürme für generische 3-, 5- und 7-MW-Anlagen:
Eigenfrequenz im 1P/3P-Fenster, Spannung als Lastindikator, Transport, Betonteile und
Kran – jeweils als Ausnutzung η mit Formel, Annahmen und Quelle. Die Eigenfrequenz im
Browser wird gegen ein unabhängiges FE-Modell in Python geprüft (Abweichung unter
0,2 %). Privates Projekt, nur öffentliche Quellen, keine Verbindung zu einem
Unternehmen.

Author: Suavi Yildirim
