# Presets

Generic turbines for the tower module (schema 1, spec §5.9). Turbine values come from
public reports, each with a page reference in `sources`. Tower geometries, foundation
stiffness k_φ and crane capacity are the author's own concept values (`label:
"author-concept"`), not data of any real product.

- `generic-3mw` – IEA Wind Task 37 3.4 MW land-based reference turbine (NREL/TP-5000-73492)
- `generic-5mw` – NREL 5 MW reference turbine (NREL/TP-500-38060)
- `generic-7mw` – scaled from the 3.4 MW turbine: D ∝ √P, rpm ∝ 1/D, masses ∝ D^2.5
