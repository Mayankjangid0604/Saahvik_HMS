/**
 * GST computation (feature 8). Single source of truth for splitting an amount
 * into taxable value + tax, reused by the receipt PDF and the invoice DTO so
 * there is never a second, divergent GST calculation.
 *
 * Money is integer paisa throughout. ASSUMPTION (documented): v1 models an
 * intra-state supply and splits the tax evenly into CGST + SGST. Inter-state
 * IGST is not modeled yet — a follow-up can branch on the buyer's state.
 * Rounding: tax is rounded to the nearest paisa, then CGST = floor(tax/2) and
 * SGST = tax − CGST so the two halves always sum back to the total tax.
 */
export interface GstConfig {
  gstEnabled: boolean;
  gstRatePercent: number;
  gstInclusive: boolean;
  gstin?: string | null;
}

export interface GstBreakdown {
  enabled: boolean;
  ratePercent: number;
  inclusive: boolean;
  taxablePaisa: number;
  taxPaisa: number;
  cgstPaisa: number;
  sgstPaisa: number;
  totalPaisa: number;
  gstin?: string;
}

/**
 * Break an amount into a GST breakdown given the org config.
 * - exclusive: `amountPaisa` is the pre-tax taxable value; tax is added on top.
 * - inclusive: `amountPaisa` already includes tax; the taxable value is
 *   back-calculated so taxable + tax === amountPaisa.
 * When GST is disabled or the rate is 0, returns a pass-through breakdown with
 * zero tax and total === amountPaisa (callers can render it uniformly).
 */
export function computeGst(amountPaisa: number, config: GstConfig): GstBreakdown {
  const rate = config.gstRatePercent;
  const base = {
    enabled: config.gstEnabled && rate > 0,
    ratePercent: rate,
    inclusive: config.gstInclusive,
    gstin: config.gstin ?? undefined,
  };
  if (!base.enabled) {
    return {
      ...base,
      taxablePaisa: amountPaisa,
      taxPaisa: 0,
      cgstPaisa: 0,
      sgstPaisa: 0,
      totalPaisa: amountPaisa,
    };
  }

  let taxablePaisa: number;
  let totalPaisa: number;
  if (config.gstInclusive) {
    taxablePaisa = Math.round((amountPaisa * 100) / (100 + rate));
    totalPaisa = amountPaisa;
  } else {
    taxablePaisa = amountPaisa;
    totalPaisa = Math.round(amountPaisa * (100 + rate) / 100);
  }
  const taxPaisa = totalPaisa - taxablePaisa;
  const cgstPaisa = Math.floor(taxPaisa / 2);
  const sgstPaisa = taxPaisa - cgstPaisa;
  return { ...base, taxablePaisa, taxPaisa, cgstPaisa, sgstPaisa, totalPaisa };
}
