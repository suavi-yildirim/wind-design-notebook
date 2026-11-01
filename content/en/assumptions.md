<!-- id: asm.rayleighShape -->
Natural frequency by Rayleigh's method with the static deflection line under a point load at the tower top. This shape is close to the first mode; the result is an upper bound.

<!-- id: asm.kPhi -->
Foundation as a rotational spring k_φ at the tower base. The value is the author's concept assumption; lateral flexibility is neglected.

<!-- id: asm.hubOffset -->
Tower height = hub height. The distance between tower top and hub (a few metres) is neglected.

<!-- id: asm.uncracked -->
Concrete C50/60 with E_cm = 37 GPa, uncracked section. Prestressing and cracking are not modelled.

<!-- id: asm.kAdd -->
Steel mass with an allowance k_add = 1.08 for flanges, platforms and internals.

<!-- id: asm.rnaRotary -->
Nacelle and rotor as a point mass at the tower top; their rotary inertia is neglected.

<!-- id: asm.loadIndicator -->
Thrust at rated wind times a peak factor k_peak = 1.5 as a rough stand-in for extreme loads. This is a load indicator, not a design load.

<!-- id: asm.windProfile -->
Wind profile v(z) = V_rated · (z/H)^α with α = 0.2; tower drag with c_f = 0.7.

<!-- id: asm.loadFactors -->
Partial factors γ_F = 1.35 (wind) and γ_G = 1.35 (self-weight), γ_M1 = 1.1 (steel).

<!-- id: asm.fyTable -->
S355 yield strength by wall thickness: up to 16 mm 355 MPa, up to 40 mm 345 MPa, up to 63 mm 335 MPa, up to 80 mm 325 MPa.

<!-- id: asm.transportLimits -->
Road transport: diameter up to 4.30 m (bridge clearances), length up to 30 m, mass up to 80 t per part. The number of segments follows from a top-down split; the segments are then spread evenly.

<!-- id: asm.ringParts -->
Concrete rings 3.8 m high, each split into 2 precast parts. The geometry of the shell parts for transport is not checked.

<!-- id: asm.hookAllowance -->
Hook height = hub height + 10 m for slings and spreader beam.

<!-- id: asm.craneCapacity -->
Crane capacity at hook height as a simple input; no manufacturer load charts.
