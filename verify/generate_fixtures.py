"""Write reference fixtures (spec §8.3) and data/fe-reference.json.

Geometry, mass and design base moment are reimplemented here independently of src/calc.
Run: python verify/generate_fixtures.py
"""

import copy
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.integrate import quad

from fe_beam import natural_frequencies

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "verify" / "fixtures"
GENERATOR = "python-fe 1.0"
N_ELEMENTS = 200

STEEL = {"E": 210e9, "rho": 7850.0}
CONCRETE = {"E": 37e9, "rho": 2500.0}
DEFAULT_LIMITS = {"lMax_m": 30, "mMax_kg": 80000, "dTransport_m": 4.30, "craneCapacity_kg": 120000,
                  "freqMargin": 0.10, "ringHeight_m": 3.8, "ringParts": 2}
DEFAULT_ASSUMPTIONS = {"kAdd": 1.08, "rhoAir": 1.225, "alpha": 0.2, "cf": 0.7, "gammaF": 1.35, "kPeak": 1.5,
                       "gammaG": 1.35, "gammaM1": 1.1, "g": 9.81, "hookAllowance_m": 10}
TURBINE_KEYS = ["ratedPower_W", "rotorDiameter_m", "hubHeight_m", "rpmMin", "rpmMax", "ratedWind_mps",
                "ctRated", "massNacelle_kg", "massRotor_kg"]
TOLERANCE = {"f1_hz": 0.03, "mass_steel_kg": 0.005, "mass_concrete_kg": 0.005, "base_moment_Nm": 0.005}


def inputs_from_preset(preset, tower_type):
    p = copy.deepcopy(preset)
    return {
        "presetId": p["id"],
        "type": tower_type,
        "turbine": {k: p["turbine"][k] for k in TURBINE_KEYS},
        "foundation": {"kPhi_Nm_per_rad": p["foundation"]["kPhi_Nm_per_rad"]},
        "steel": {"segments": p["towers"]["steel"]["segments"]},
        "hybrid": {"concrete": p["towers"]["hybrid"]["concrete"],
                   "steel": {"segments": p["towers"]["hybrid"]["steel"]["segments"]}},
        "limits": {**DEFAULT_LIMITS, **p.get("limits", {})},
        "assumptions": {**DEFAULT_ASSUMPTIONS, **p.get("assumptions", {})},
    }


class Tower:
    """Continuous description of the tower: D(z), t(z), material(z)."""

    def __init__(self, inputs):
        self.H = inputs["turbine"]["hubHeight_m"]
        self.k_add = inputs["assumptions"]["kAdd"]
        if inputs["type"] == "steel":
            self.h_tr = 0.0
            self.zones = inputs["steel"]["segments"]
            self.concrete = None
        else:
            self.concrete = inputs["hybrid"]["concrete"]
            self.h_tr = self.concrete["hTr_m"]
            self.zones = inputs["hybrid"]["steel"]["segments"]
        # absolute zone boundaries over the steel length
        length = self.H - self.h_tr
        self.bounds = [self.h_tr]
        for zone in self.zones:
            self.bounds.append(self.bounds[-1] + zone["lengthFrac"] * length)
        self.bounds[-1] = self.H

    def material(self, z):
        return "concrete" if self.concrete is not None and z < self.h_tr else "steel"

    def geometry(self, z):
        if self.material(z) == "concrete":
            c = self.concrete
            u = z / self.h_tr
            return c["dBot_m"] + (c["dTop_m"] - c["dBot_m"]) * u, c["t_m"]
        for i, zone in enumerate(self.zones):
            lo, hi = self.bounds[i], self.bounds[i + 1]
            if z <= hi or i == len(self.zones) - 1:
                u = min(1.0, max(0.0, (z - lo) / (hi - lo)))
                return (zone["dBot_m"] + (zone["dTop_m"] - zone["dBot_m"]) * u,
                        zone["tBot_m"] + (zone["tTop_m"] - zone["tBot_m"]) * u)
        raise AssertionError("unreachable")

    def section(self, z):
        d, t = self.geometry(z)
        di = d - 2 * t
        area = math.pi / 4 * (d**2 - di**2)
        inertia = math.pi / 64 * (d**4 - di**4)
        if self.material(z) == "concrete":
            return CONCRETE["E"] * inertia, CONCRETE["rho"] * area, d
        return STEEL["E"] * inertia, STEEL["rho"] * area * self.k_add, d

    def breakpoints(self):
        pts = sorted(set([0.0, self.h_tr, *self.bounds, self.H]))
        return [p for p in pts if 0.0 <= p <= self.H]

    def integrate(self, f, lo, hi):
        pts = [p for p in self.breakpoints() if lo < p < hi]
        edges = [lo, *pts, hi]
        return sum(quad(f, a, b, limit=200)[0] for a, b in zip(edges[:-1], edges[1:]) if b > a)


def fe_f1(tower, inputs):
    if tower.concrete is not None:
        n_c = max(2, round(N_ELEMENTS * tower.h_tr / tower.H))
        nodes = np.concatenate([np.linspace(0, tower.h_tr, n_c + 1),
                                np.linspace(tower.h_tr, tower.H, N_ELEMENTS - n_c + 1)[1:]])
    else:
        nodes = np.linspace(0, tower.H, N_ELEMENTS + 1)
    mids = (nodes[:-1] + nodes[1:]) / 2
    props = [tower.section(z) for z in mids]
    tb = inputs["turbine"]
    return float(natural_frequencies(nodes, [p[0] for p in props], [p[1] for p in props],
                                     k_phi=inputs["foundation"]["kPhi_Nm_per_rad"],
                                     m_tip=tb["massNacelle_kg"] + tb["massRotor_kg"], n_modes=1)[0])


def masses(tower):
    mu = lambda z: tower.section(z)[1]  # noqa: E731
    steel = tower.integrate(mu, tower.h_tr, tower.H)
    concrete = tower.integrate(mu, 0.0, tower.h_tr) if tower.concrete is not None else 0.0
    return steel, concrete


def base_moment(tower, inputs):
    tb, a = inputs["turbine"], inputs["assumptions"]
    area = math.pi * (tb["rotorDiameter_m"] / 2) ** 2
    thrust = 0.5 * a["rhoAir"] * area * tb["ctRated"] * tb["ratedWind_mps"] ** 2

    def q(z):
        v = tb["ratedWind_mps"] * (z / tower.H) ** a["alpha"]
        return 0.5 * a["rhoAir"] * v**2 * a["cf"] * tower.section(z)[2]

    drag_moment = tower.integrate(lambda z: q(z) * z, 0.0, tower.H)
    return a["gammaF"] * a["kPeak"] * (thrust * tower.H + drag_moment)


def sig(x, digits=6):
    return 0.0 if x == 0 else float(f"{x:.{digits}g}")


def fixture(case, inputs):
    tower = Tower(inputs)
    steel, concrete = masses(tower)
    return {
        "schema": 1,
        "case": case,
        "generator": GENERATOR,
        "inputs": inputs,
        "expected": {
            "f1_hz": sig(fe_f1(tower, inputs)),
            "mass_steel_kg": sig(steel),
            "mass_concrete_kg": sig(concrete),
            "base_moment_Nm": sig(base_moment(tower, inputs)),
        },
        "tolerance": dict(TOLERANCE),
    }


def extra_cases(presets):
    uniform = {
        "presetId": "test-uniform", "type": "steel",
        "turbine": {"ratedPower_W": 5e6, "rotorDiameter_m": 126, "hubHeight_m": 100, "rpmMin": 6.9, "rpmMax": 12.1,
                    "ratedWind_mps": 11.4, "ctRated": 0.8, "massNacelle_kg": 60000, "massRotor_kg": 40000},
        "foundation": {"kPhi_Nm_per_rad": 1e15},
        "steel": {"segments": [{"lengthFrac": 1, "dBot_m": 4, "dTop_m": 4, "tBot_m": 0.02, "tTop_m": 0.02}]},
        "hybrid": {"concrete": {"hTr_m": 60, "dBot_m": 9, "dTop_m": 5, "t_m": 0.35},
                   "steel": {"segments": [{"lengthFrac": 1, "dBot_m": 4.3, "dTop_m": 3.5, "tBot_m": 0.03, "tTop_m": 0.018}]}},
        "limits": dict(DEFAULT_LIMITS), "assumptions": dict(DEFAULT_ASSUMPTIONS),
    }
    soft = inputs_from_preset(presets["generic-5mw"], "steel")
    soft["foundation"]["kPhi_Nm_per_rad"] = 2e10
    return {"uniform-steel": uniform, "soft-foundation-5mw-steel": soft}


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def build_all():
    """All fixtures and the deployed FE reference, computed in memory."""
    presets = {p.stem: json.loads(p.read_text(encoding="utf-8"))
               for p in sorted((ROOT / "data" / "presets").glob("*.json"))}
    cases = {}
    for pid, preset in presets.items():
        for tower_type in ("steel", "hybrid"):
            cases[f"{pid}-{tower_type}"] = inputs_from_preset(preset, tower_type)
    preset_cases = set(cases)
    cases.update(extra_cases(presets))
    fixtures = {case: fixture(case, inputs) for case, inputs in cases.items()}
    reference = {"schema": 1, "generator": GENERATOR,
                 "cases": {c: {"f1_hz": fixtures[c]["expected"]["f1_hz"]} for c in cases if c in preset_cases}}
    return fixtures, reference


def check_fixtures(rel=1e-4):
    """Compare committed files with a fresh run. Inputs must match exactly, numbers within `rel`
    (eigenvalues differ in the last digits between LAPACK builds). Returns a list of problems."""
    fixtures, reference = build_all()
    problems = []
    committed = {p.stem for p in FIXTURES.glob("*.json")}
    for name in sorted(committed ^ set(fixtures)):
        problems.append(f"{name}: fixture file missing or not generated")

    def close(a, b):
        return a == b or abs(a - b) <= rel * max(abs(a), abs(b))

    for case, fx in fixtures.items():
        path = FIXTURES / f"{case}.json"
        if not path.exists():
            continue
        old = json.loads(path.read_text(encoding="utf-8"))
        for key in ("schema", "case", "generator", "inputs", "tolerance"):
            if old.get(key) != fx[key]:
                problems.append(f"{case}: '{key}' differs")
        for key, value in fx["expected"].items():
            if key not in old.get("expected", {}) or not close(old["expected"][key], value):
                problems.append(f"{case}: expected.{key} {old.get('expected', {}).get(key)} != {value}")
    ref_old = json.loads((ROOT / "data" / "fe-reference.json").read_text(encoding="utf-8"))
    if set(ref_old.get("cases", {})) != set(reference["cases"]) or any(
            not close(ref_old["cases"][c]["f1_hz"], v["f1_hz"]) for c, v in reference["cases"].items()):
        problems.append("data/fe-reference.json differs")
    return problems


def main(argv):
    if "--check" in argv:
        problems = check_fixtures()
        for p in problems:
            print(p)
        print("fixtures: fresh" if not problems else f"fixtures: {len(problems)} problem(s) - run python verify/generate_fixtures.py")
        return 1 if problems else 0
    fixtures, reference = build_all()
    FIXTURES.mkdir(exist_ok=True)
    for case, fx in fixtures.items():
        write_json(FIXTURES / f"{case}.json", fx)
        print(f"{case:30s} f1={fx['expected']['f1_hz']:.4f} Hz")
    write_json(ROOT / "data" / "fe-reference.json", reference)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
