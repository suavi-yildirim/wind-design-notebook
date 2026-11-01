<!-- id: lim.fatigue -->
**Fatigue** – not assessed. In real towers it often drives the wall thickness, but it needs load spectra from simulations.

<!-- id: lim.buckling -->
**Shell buckling to EN 1993-1-6** – only as a D/t plausibility check. A buckling check needs imperfections and the stress distribution.

<!-- id: lim.flanges -->
**Flanges and bolts** – not checked; their mass is covered by the allowance k_add.

<!-- id: lim.prestress -->
**Concrete prestressing, decompression and cracking** – not modelled; the concrete part is treated as uncracked.

<!-- id: lim.transition -->
**Concrete/steel transition piece** – not modelled separately; stiffness and mass jump at the transition height.

<!-- id: lim.foundation -->
**Foundation design and lateral flexibility** – out of scope; only the rotational spring k_φ enters.

<!-- id: lim.ssi -->
**Soil-structure interaction** – not considered beyond k_φ.

<!-- id: lim.rnaRotary -->
**Rotary inertia of the nacelle** – neglected; in reality it lowers f₁ slightly.

<!-- id: lim.higherModes -->
**Second and higher bending modes** – not considered; only f₁ enters the check.

<!-- id: lim.aeroelastic -->
**Aeroelastic coupling and damping** – not considered; this needs coupled simulations.

<!-- id: lim.dlc -->
**Extreme loads from design load cases (DLC) to IEC 61400-1** – only a load indicator from rated thrust.

<!-- id: lim.noSizing -->
**No automatic wall-thickness sizing in the design space** – the map only varies hub height and base diameter or transition height.

<!-- id: lim.generic -->
**Generic presets** – reference turbines from public reports and the author's own tower geometries, not real products.

<!-- id: lim.hubOffset -->
**Tower height = hub height** – the tower top to hub distance is neglected; this is slightly conservative for frequency and moment.

<!-- id: lim.shellTransport -->
**Transport geometry of the concrete shells** – not checked, only their mass.

<!-- id: lim.exclusionZone -->
**Speed exclusion zones** – not modelled. The wide speed ranges of modern turbines leave no free 1P/3P window; the check reports this as an error instead of an η.
