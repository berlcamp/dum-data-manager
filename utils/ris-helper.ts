// RIS monetary values are tracked up to 2 decimal places (centavos).
//
// `ddm_ris.total_amount` is computed by the database and comes back rounded to
// whole pesos (e.g. 188.956 L x 92 = 17,383.952 is stored as 17,384), which
// loses centavos on lists, gas slips and accounting reports. Always derive the
// amount from quantity x price and only fall back to the stored column when
// either operand is missing.

export const RIS_DECIMALS = 2

const FACTOR = 10 ** RIS_DECIMALS

// Trims binary floating point noise (e.g. 17383.952000000002) without dropping
// any of the decimals we care about.
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

// For printed/exported tables (PDFs, Excel): whole numbers print bare ("3",
// not "3.00"), anything with a fraction gets RIS_DECIMALS places ("3.50").
// Blank stays blank so empty cells don't print "0".
export const toRisFixed = (n?: number | string | null): string => {
  if (n === null || n === undefined || n === '') return ''
  const value = roundRisAmount(Number(n))
  return Number.isInteger(value) ? String(value) : value.toFixed(RIS_DECIMALS)
}

// Summary report figures with thousands separators. Quantities follow the
// toRisFixed rule ("1,000", "1,000.50"); money always shows RIS_DECIMALS
// places ("8,000.00").
export const toRisQty = (n?: number | string | null): string => {
  if (n === null || n === undefined || n === '') return ''
  const value = roundRisAmount(Number(n))
  const decimals = Number.isInteger(value) ? 0 : RIS_DECIMALS
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const toRisMoney = (n?: number | string | null): string => {
  if (n === null || n === undefined || n === '') return ''
  return roundRisAmount(Number(n)).toLocaleString('en-US', {
    minimumFractionDigits: RIS_DECIMALS,
    maximumFractionDigits: RIS_DECIMALS,
  })
}
