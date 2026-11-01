<!-- id: about.what -->
## Was ist das?
Wind Design Notebook ist ein öffentliches Lern- und Neugierprojekt über die Auslegung von Windenergieanlagen. Es folgt einer Anlage in drei Modulen: **Rotor → Turm → Straße**. Das erste fertige Modul ist der **Turm**: Ein Rechner im Browser, der Stahl- und Hybridtürme für generische 3-, 5- und 7-MW-Anlagen bewertet.

<!-- id: about.why -->
## Warum?
Ein Turm ist ein schönes Ingenieursproblem: Er muss steif genug sein, um nicht in Resonanz zu geraten, stark genug für Wind und Gewicht – und trotzdem in Teilen über die Straße passen. Diese Zielkonflikte wollte ich nicht nur lesen, sondern selbst durchrechnen und sichtbar machen.

<!-- id: about.how -->
## Wie es gerechnet wird
Jedes Ergebnis zeigt Formel, Annahmen und Quelle. Die Rechnung ist reines JavaScript ohne Build-Schritt – „Quelltext anzeigen“ zeigt die Formeln. Jeder Nachweis wird als Ausnutzung η ausgedrückt (Anforderung geteilt durch Grenze); der größte Wert ist maßgebend.

<!-- id: about.verify -->
## Wie es geprüft wird
Die Eigenfrequenz im Browser (Rayleigh-Verfahren) wird gegen ein **unabhängiges Finite-Elemente-Modell in Python** (Euler-Bernoulli-Balken, numpy/scipy) geprüft. Das FE-Modell teilt keinen Code mit dem Browser; es wird selbst gegen analytische Lösungen getestet und schreibt Referenzdateien, gegen die automatische Tests laufen. Für alle Vorlagen liegt die Abweichung unter 3 %.

<!-- id: about.skills -->
## Was es zeigt
Strukturdynamik (Eigenfrequenz, Campbell-Diagramm), Stahlbau-Grundlagen (Querschnitte, Spannungsnachweis, Werkstoffkennwerte), Transport- und Montagelogik, numerische Verifikation, saubere Annahmen und Grenzen – und das Ganze verständlich aufbereitet, zweisprachig.

<!-- id: about.not -->
## Was es nicht ist
Kein Bemessungswerkzeug. Keine Ermüdung, kein Beulnachweis, keine Lastfallsimulationen. Die Grenzen stehen vollständig im Abschnitt ④ des Turm-Moduls.

<!-- id: about.disclaimer -->
## Hinweis
Privates Projekt von Suavi Yildirim. Ausschließlich öffentliche Quellen. Keine Verbindung zu einem Unternehmen; keine Daten, Geometrien oder Marken von Herstellern. Die Turmgeometrien sind eigene Konzeptannahmen.
