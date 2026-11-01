<!-- id: about.what -->
## What is this?
Wind Design Notebook is a public learning and curiosity project about wind turbine design. It follows one turbine through three modules: **Rotor → Tower → Road**. The first finished module is the **tower**: a calculator in the browser that assesses steel and hybrid towers for generic 3, 5 and 7 MW turbines.

<!-- id: about.why -->
## Why?
A tower is a beautiful engineering problem: it must be stiff enough to avoid resonance, strong enough for wind and weight – and still fit on the road in parts. I wanted to do more than read about these trade-offs: I wanted to calculate them myself and make them visible.

<!-- id: about.how -->
## How it is calculated
Every result shows its formula, assumptions and source. The calculation is plain JavaScript with no build step – "view source" shows the formulas. Every check is expressed as a utilisation η (demand divided by limit); the largest value governs.

<!-- id: about.verify -->
## How it is verified
The natural frequency in the browser (Rayleigh's method) is checked against an **independent finite element model in Python** (Euler-Bernoulli beam, numpy/scipy). The FE model shares no code with the browser; it is itself tested against analytical solutions and writes reference files that automated tests run against. For all presets the deviation is below 3 %.

<!-- id: about.skills -->
## What it shows
Structural dynamics (natural frequency, Campbell diagram), steel design basics (sections, stress check, material properties), transport and installation logic, numerical verification, honest assumptions and limitations – all explained clearly, in two languages.

<!-- id: about.not -->
## What it is not
Not a design tool. No fatigue, no buckling check, no load case simulations. The full list of limitations is in section ④ of the tower module.

<!-- id: about.disclaimer -->
## Note
Personal project by Suavi Yildirim. Public sources only. No affiliation with any company; no data, geometries or brands of any manufacturer. The tower geometries are the author's own concept assumptions.
