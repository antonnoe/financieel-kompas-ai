/**
 * src/engine.js
 *
 * Small, pure calculation helpers extracted from the single-file app.
 *
 * Exported functions:
 * - computeFamilyParts(isCouple, children)
 * - computePFUTax(baseAmount, rate)
 * - computeIFI(propertyWealth, brackets, thresholdStart)
 * - calculateNLNettoPure({ baseIncome, salary, business, params, isAboveAOW })
 *
 * These functions intentionally validate numeric inputs, avoid DOM, and are deterministic
 * so they can be tested independently from the UI.
 */

function ensureNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Compute the French "parts" family quotient approximation using the repository's formula.
 * - isCouple: boolean
 * - children: number (integer >= 0)
 *
 * This reproduces the compact logic found in the app:
 * parts = (isCouple ? 2 : 1) + (children>2 ? (children-2)*1 + 1 : children*0.5)
 */
function computeFamilyParts(isCouple, children) {
  const c = Math.max(0, Math.floor(ensureNumber(children)));
  const base = isCouple ? 2 : 1;
  const extra = c > 2 ? (c - 2) * 1 + 1 : c * 0.5;
  return base + extra;
}

/**
 * Compute PFU / flat capital income tax as a simple multiplication.
 * - baseAmount: number
 * - rate: number (e.g. 0.128 for 12.8%)
 */
function computePFUTax(baseAmount, rate) {
  const b = ensureNumber(baseAmount);
  const r = ensureNumber(rate);
  return b * r;
}

/**
 * Compute IFI (simplified) based on progressive brackets.
 * - propertyWealth: number
 * - brackets: array of { grens: number | Infinity, tarief: number }
 * - thresholdStart: number (tax-free threshold / primary residence deduction baseline)
 *
 * The function follows the loop pattern used in the original script:
 * start at prevLimit = thresholdStart, then for each bracket compute the taxable slice and multiply by its rate.
 *
 * Returns numeric tax (>= 0).
 */
function computeIFI(propertyWealth, brackets, thresholdStart = Infinity) {
  const w = ensureNumber(propertyWealth);
  const tStart = ensureNumber(thresholdStart);
  if (!Array.isArray(brackets) || w <= tStart) return 0;
  let tax = 0;
  let prevLimit = tStart;
  // Ensure ordered brackets (lowest to highest)
  for (const b of brackets) {
    const limit = b.grens === Infinity ? Infinity : ensureNumber(b.grens);
    const rate = ensureNumber(b.tarief);
    if (w <= prevLimit) break;
    // taxable portion within this bracket:
    const taxable = Math.max(0, Math.min(w, limit) - prevLimit);
    tax += taxable * rate;
    prevLimit = limit;
    if (w <= limit) break;
  }
  return tax;
}

/**
 * calculateNLNettoPure - extracted and simplified pure version of calculateNLNetto.
 * Parameters are packaged so this function has no DOM dependency and is fully testable.
 *
 * inputs:
 * - baseIncome: number (pI in original; can represent pensions included)
 * - salary: number (s)
 * - business: number (b)
 * - params: object (expected minimal subset of PARAMS.NL)
 *    params.BOX1.MKB_WINSTVRIJSTELLING
 *    params.SOCIALE_LASTEN.ZVW_PERCENTAGE
 *    params.BOX1.TARIEVEN_BOVEN_AOW (array)
 *    params.BOX1.TARIEVEN_ONDER_AOW (array)
 *    params.BOX1.GRENS_SCHIJF_1
 *    params.BOX1.ARBEIDSKORTING_MAX
 *    params.BOX1.ALGEMENE_HEFFINGSKORTING_MAX
 *    params.BOX1.HK_AFBOUW_START
 *    params.BOX1.HK_AFBOUW_FACTOR
 *
 * - isAboveAOW: boolean (whether to use 'boven AOW' tariff set)
 *
 * Returns: { bruto, tax, netto } numbers
 */
function calculateNLNettoPure({ baseIncome = 0, salary = 0, business = 0, params = {}, isAboveAOW = false }) {
  const p = params || {};
  const box1 = p.BOX1 || {};
  const soc = p.SOCIALE_LASTEN || {};

  const mkbFraction = ensureNumber(box1.MKB_WINSTVRIJSTELLING || 0);
  const zvwPct = ensureNumber(soc.ZVW_PERCENTAGE || 0);
  const wNV = ensureNumber(business) * (1 - mkbFraction);
  const zB = business > 0 ? wNV : 0;
  const z = zB * zvwPct;
  const bruto = ensureNumber(baseIncome) + ensureNumber(salary) + wNV;
  if (bruto <= 0 && z <= 0) return { bruto: 0, tax: 0, netto: 0 };
  if (bruto <= 0 && z > 0) return { bruto: 0, tax: z, netto: -z };

  // 3-schijven berekening (2026: Belastingdienst.nl)
  const T = isAboveAOW ? (box1.TARIEVEN_BOVEN_AOW || []) : (box1.TARIEVEN_ONDER_AOW || []);
  const gS1 = ensureNumber(box1.GRENS_SCHIJF_1 || 38883);
  const gS2 = ensureNumber(box1.GRENS_SCHIJF_2 || 78426);
  const r1 = (T && T[0]) ? ensureNumber(T[0]) : 0;
  const r2 = (T && T[1]) ? ensureNumber(T[1]) : r1;
  const r3 = (T && T[2]) ? ensureNumber(T[2]) : r2;

  let t = 0;
  if (bruto <= gS1) {
    t = bruto * r1;
  } else if (bruto <= gS2) {
    t = (gS1 * r1) + ((bruto - gS1) * r2);
  } else {
    t = (gS1 * r1) + ((gS2 - gS1) * r2) + ((bruto - gS2) * r3);
  }

  // Algemene heffingskorting (Rijksoverheid.nl 2026)
  let algemeneKorting = ensureNumber(box1.ALGEMENE_HEFFINGSKORTING_MAX || 0);
  const hAS = ensureNumber(box1.HK_AFBOUW_START || 29736);
  const hAF = ensureNumber(box1.HK_AFBOUW_FACTOR || 0.06398);
  if (bruto > hAS) {
    algemeneKorting = Math.max(0, algemeneKorting - ((bruto - hAS) * hAF));
  }

  // Arbeidskorting (Rijksoverheid.nl 2026)
  let arbeidKorting = (salary > 0 || business > 0) ? ensureNumber(box1.ARBEIDSKORTING_MAX || 0) : 0;
  const akAS = ensureNumber(box1.AK_AFBOUW_START || 45592);
  const akAF = ensureNumber(box1.AK_AFBOUW_FACTOR || 0.0651);
  if (bruto > akAS) {
    arbeidKorting = Math.max(0, arbeidKorting - ((bruto - akAS) * akAF));
  }

  t = Math.max(0, t - algemeneKorting - arbeidKorting);
  const totalTax = t + z;
  const netto = bruto - totalTax;
  return { bruto, tax: totalTax, netto };
}

module.exports = {
  computeFamilyParts,
  computePFUTax,
  computeIFI,
  calculateNLNettoPure,
};
