<!-- id: explain.freq -->
Every wind turbine excites its tower at two rates: once per rotor revolution (**1P**, e.g. from imbalance) and three times per revolution when a blade passes the tower (**3P**). If the tower's natural frequency falls into one of these bands, it resonates. The usual concept is **"soft-stiff"**: f₁ lies between the 1P band and the 3P band, with a safety margin on both sides.

<!-- id: explain.stress -->
Rotor thrust at rated wind and the wind on the tower create a bending moment that grows towards the base. Together with self-weight this gives the extreme-fibre stress in the steel tube. Because real extreme loads only come from aeroelastic simulations, this is a **load indicator**: it shows where the tower is most stressed and roughly how much reserve remains.

<!-- id: explain.transport -->
Steel towers travel by road in tubular sections. The limiting value is usually the **diameter**: about 4.30 m fits under bridges. Tall towers need a larger diameter at the base for stiffness and strength – this is exactly where the **hybrid tower** becomes interesting: concrete below in transportable precast parts, steel above.

<!-- id: explain.crane -->
Installation is limited by the heaviest lift at great height. Often this is the nacelle; with thick steel segments or heavy concrete parts it can be a tower component.

<!-- id: explain.masses -->
The masses drive material, transports and the foundation. Concrete is heavy but cheap and can be made in transportable parts; steel is light but more expensive and limited in diameter.

<!-- id: explain.designSpace -->
The map computes 1,600 variants at once. It shows which check governs where – for the steel tower, the **transport diameter** usually becomes the limit as hub height grows; for the hybrid tower the limit moves upwards.

<!-- id: explain.scaling -->
The 7 MW turbine is scaled from the 3.4 MW reference: rotor diameter ∝ √P, rotor speed ∝ 1/D (same tip speed), masses ∝ D^2.5. This is a rough, disclosed approximation, not a real turbine.
