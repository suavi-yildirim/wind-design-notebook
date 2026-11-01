<!-- id: lim.fatigue -->
**Ermüdung** – nicht bewertet. Bei realen Türmen bestimmt sie oft die Wanddicke, braucht aber Lastkollektive aus Simulationen.

<!-- id: lim.buckling -->
**Schalenbeulen nach EN 1993-1-6** – nur als D/t-Plausibilität. Ein Beulnachweis braucht Imperfektionen und Spannungsverteilung.

<!-- id: lim.flanges -->
**Flansche und Schrauben** – nicht nachgewiesen; ihre Masse steckt pauschal im Zuschlag k_add.

<!-- id: lim.prestress -->
**Vorspannung, Dekompression und Rissbildung im Beton** – nicht abgebildet; der Betonteil wird ungerissen gerechnet.

<!-- id: lim.transition -->
**Übergangsstück Beton/Stahl** – nicht separat modelliert; Steifigkeit und Masse springen an der Übergangshöhe.

<!-- id: lim.foundation -->
**Fundamentbemessung und horizontale Nachgiebigkeit** – außerhalb des Umfangs; nur die Drehfeder k_φ geht ein.

<!-- id: lim.ssi -->
**Boden-Bauwerk-Interaktion** – über k_φ hinaus nicht berücksichtigt.

<!-- id: lim.rnaRotary -->
**Drehträgheit der Gondel** – vernachlässigt; senkt in der Realität f₁ leicht.

<!-- id: lim.higherModes -->
**Zweite und höhere Biegeeigenformen** – nicht betrachtet; nur f₁ geht in den Nachweis ein.

<!-- id: lim.aeroelastic -->
**Aeroelastische Kopplung und Dämpfung** – nicht berücksichtigt; dafür braucht es gekoppelte Simulationen.

<!-- id: lim.dlc -->
**Extremlasten aus Lastfällen (DLC) nach IEC 61400-1** – nur ein Lastindikator aus dem Nennschub.

<!-- id: lim.noSizing -->
**Keine automatische Wanddickenbemessung im Entwurfsraum** – die Karte variiert nur Nabenhöhe und Fußdurchmesser bzw. Übergangshöhe.

<!-- id: lim.generic -->
**Generische Vorlagen** – Referenzturbinen aus öffentlichen Berichten und eigene Turmgeometrien, keine realen Produkte.

<!-- id: lim.hubOffset -->
**Turmhöhe = Nabenhöhe** – der Abstand Turmkopf–Nabe wird vernachlässigt; das ist leicht konservativ für Frequenz und Moment.

<!-- id: lim.shellTransport -->
**Transportgeometrie der Betonschalen** – nicht geprüft, nur ihre Masse.

<!-- id: lim.exclusionZone -->
**Drehzahl-Sperrbereiche** – nicht abgebildet. Breite Drehzahlbereiche moderner Anlagen lassen kein freies 1P/3P-Fenster; der Nachweis meldet das als Fehler statt eines η.
