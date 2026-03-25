# Financieel Kompas — Audit Fiscale Parameters 2026

**Datum:** 25 maart 2026
**Doel:** config.json + engine.js updaten van 2024-waarden naar 2026-waarden
**Status:** CORRECTIES VEREIST

---

## NEDERLAND — Box 1 (KRITIEK: engine moet van 2→3 schijven)

### Config 2024 (FOUT) → Correctie 2026

| Parameter | Config (2024) | Correct 2026 | Bron |
|-----------|---------------|--------------|------|
| Schijf 1 grens | €75.518 (2 schijven) | €38.883 | Belastingdienst.nl |
| Schijf 1 tarief (onder AOW) | 36,97% | 35,75% | Belastingdienst.nl |
| Schijf 2 grens | n.v.t. | €78.426 | Belastingdienst.nl |
| Schijf 2 tarief | n.v.t. | 37,56% | Belastingdienst.nl |
| Schijf 3 tarief | 49,5% | 49,50% | Belastingdienst.nl |
| Schijf 1 tarief (AOW-leeftijd+) | 19,07% | 17,85% | Deloitte Belastingplan 2026 |
| Algemene heffingskorting max | €3.362 | €3.115 | Rijksoverheid.nl |
| AHK afbouw start | €24.813 | €29.736 | Deloitte Belastingplan 2026 |
| AHK afbouw factor | 6,63% | 6,398% | Deloitte Belastingplan 2026 |
| AHK nul bij | n.v.t. | €78.426 | MKB Servicedesk |
| Arbeidskorting max | €5.532 | €5.685 | Rijksoverheid.nl |
| Arbeidskorting afbouw start | €39.957 | €45.592 | Rijksoverheid.nl |
| Arbeidskorting afbouw % | 6,51% | 6,51% | Rijksoverheid.nl (ongewijzigd) |
| Zvw percentage | 5,26% | 5,26% | KVK (ongewijzigd 2026) |
| MKB-winstvrijstelling | 12,7% | 12,7% | Driebergen Accountants (ongewijzigd) |

### Box 3

| Parameter | Config (2024) | Correct 2026 | Bron |
|-----------|---------------|--------------|------|
| Vrijstelling single | €57.684 | €59.357 | Rijksoverheid.nl |
| Vrijstelling couple | €115.368 | €118.714 | Rijksoverheid.nl |
| Tarief | 36% | 36% | Belastingdienst.nl (ongewijzigd) |
| Forfaitair rendement | 6,17% | 6,00% (overige bezittingen) | AAme Adviseurs |

### AOW

| Parameter | Config | Correct 2026 | Bron |
|-----------|--------|--------------|------|
| AOW bruto single | €19.500 | Nader te verifiëren (indexatie) | SVB.nl |
| AOW bruto couple | €13.000 | Nader te verifiëren (indexatie) | SVB.nl |

### ENGINE WIJZIGING VEREIST
De engine `calculateNLNetto()` berekent met 2 schijven. Moet 3 schijven worden.
- Schijf 1: tot €38.883 → 35,75% (onder AOW) / 17,85% (AOW+)
- Schijf 2: €38.883 - €78.426 → 37,56%
- Schijf 3: > €78.426 → 49,50%

---

## FRANKRIJK — Barème 2026 (revenus 2025)

### Config 2024 → Correctie 2026

| Parameter | Config (2024) | Correct 2026 | Bron |
|-----------|---------------|--------------|------|
| Schijf 0% tot | €11.497 | €11.600 | Service-public.fr (loi finances 2026) |
| Schijf 11% tot | €29.315 | €29.579 | Service-public.fr |
| Schijf 30% tot | €83.823 | €84.577 | Economie.gouv.fr |
| Schijf 41% tot | €180.294 | €181.917 | Economie.gouv.fr |
| Schijf 45% | daarboven | daarboven | (ongewijzigd) |
| QF plafond/half part | €1.759 | €1.807 | Service-public.fr |
| PFU tarief | 12,8% | 12,8% | (ongewijzigd) |
| Sociale lasten pensioen | 9,1% | 9,1% | (ongewijzigd) |

### Abattement 65+

| Parameter | Config | Correct 2026 | Bron |
|-----------|--------|--------------|------|
| Drempel 1 | €17.200 | Nader te verifiëren (+0,9% indexatie) | impots.gouv.fr |
| Aftrek 1 | €2.746 | Nader te verifiëren | impots.gouv.fr |
| Drempel 2 | €27.670 | Nader te verifiëren | impots.gouv.fr |
| Aftrek 2 | €1.373 | Nader te verifiëren | impots.gouv.fr |

---

## BELGIË — Aanslagjaar 2027 (inkomsten 2026)

### Config 2024 → Correctie 2026

| Parameter | Config (2024) | Correct 2026 | Bron |
|-----------|---------------|--------------|------|
| PB schijf 25% tot | €16.320 | €16.320 | FPS Finance (stabiel) |
| PB schijf 40% tot | €28.800 | €28.800 | VLAIO (stabiel) |
| PB schijf 45% tot | €49.840 | €49.840 | Dexxter.be (stabiel) |
| PB schijf 50% | daarboven | daarboven | (ongewijzigd) |
| Belastingvrije som | €10.910 | €11.180 | FPS Finance / Wikifin.be |
| RSZ werknemer | 13,07% | 13,07% | (ongewijzigd) |
| Roerende voorheffing | 30%/15% | 30%/15% (+ VVPR-bis 15%→18%) | Creafisc.be |
| Gemeentebelasting gem. | 7,17% | 7,17% | (aanname, varieert per gemeente) |

---

## SAMENVATTING ACTIES

1. **config.json**: NL Box 1 → 3 schijven + alle 2026-waarden
2. **engine.js**: `calculateNLNettoPure()` herschrijven voor 3 schijven
3. **script.js**: `calculateNLNetto()` herschrijven voor 3 schijven
4. **config.json**: FR barème → 2026 grenzen (+0,9%)
5. **config.json**: FR QF plafond → €1.807
6. **config.json**: BE belastingvrije som → €11.180
7. **config.json**: NL Box 3 vrijstelling → €59.357/€118.714, rendement 6,00%
8. **config.json**: NL heffingskortingen → 2026 waarden
9. **index.html**: tooltips aanpassen met bronvermelding
