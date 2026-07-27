// RIS monetary values are tracked up to 4 decimal places.
//
// `ddm_ris.total_amount` is computed by the database and comes back rounded to
// whole pesos (e.g. 188.956 L x 92 = 17,383.952 is stored as 17,384), which
// loses centavos on lists, gas slips and accounting reports. Always derive the
// amount from quantity x price and only fall back to the stored column when
// either operand is missing.

export const RIS_DECIMALS = 4

const FACTOR = 10 ** RIS_DECIMALS

// Trims binary floating point noise (e.g. 17383.952000000002) without dropping
// any of the 4 decimals we care about.
export const roundRisAmount = (n: number): number => {
  const value = Number(n)
  if (!isFinite(value)) return 0
  return Math.round(value * FACTOR) / FACTOR
}

interface RisAmountSource {
  quantity?: number | null
  price?: number | null
  total_amount?: number | null
}

export const getRisAmount = (ris?: RisAmountSource | null): number => {
  if (!ris) return 0

  const quantity = Number(ris.quantity ?? 0)
  const price = Number(ris.price ?? 0)

  if (quantity && price) return roundRisAmount(quantity * price)

  return roundRisAmount(Number(ris.total_amount ?? 0))
}

export const formatRisAmount = (n: number): string =>
  roundRisAmount(Number(n)).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: RIS_DECIMALS,
  })
