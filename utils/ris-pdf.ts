import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

// Signatories must never sit alone on a page: at least this many data rows
// (plus the totals row) stay on the same page as them.
export const ROWS_WITH_SIGNATORIES = 2

const keepRowId = (key: string) => `keep-row:${key}`
export const signatoriesId = (key: string) => `signatories:${key}`

type SignedTable = {
  key: string // unique per table/signatories pair in the document
  header: any[][] // repeated on every page
  rows: any[][]
  footer: any[][] // totals, always kept with the last rows
  widths: any[]
  layout?: any
  margin?: any
}

// Builds the table node(s) for a section that ends with signatories. When the
// section is in `splitKeys`, its last rows start a new page together with the
// footer so the signatories below them are not left alone.
export const signedTableNodes = (t: SignedTable, splitKeys: Set<string>) => {
  const splitAt = t.rows.length - ROWS_WITH_SIGNATORIES
  const rows = t.rows.map((row, i) => {
    if (i !== splitAt) return row
    const first = typeof row[0] === 'object' ? row[0] : { text: row[0] }
    return [{ ...first, id: keepRowId(t.key) }, ...row.slice(1)]
  })

  const tableNode = (body: any[][], extra: Record<string, any> = {}) => ({
    table: {
      headerRows: t.header.length,
      dontBreakRows: true,
      widths: t.widths,
      body: [...t.header, ...body],
    },
    layout: t.layout,
    ...extra,
  })

  if (splitAt > 0 && splitKeys.has(t.key)) {
    return [
      tableNode(rows.slice(0, splitAt)),
      tableNode([...rows.slice(splitAt), ...t.footer], {
        pageBreak: 'before',
        margin: t.margin,
      }),
    ]
  }
  return [tableNode([...rows, ...t.footer], { margin: t.margin })]
}

// pdfmake has no "keep with previous rows" option, so lay the document out
// once to see where each section's signatories land, then rebuild it with the
// sections whose signatories ended up past their last rows split.
export const buildSignedPdf = async (
  build: (splitKeys: Set<string>) => TDocumentDefinitions,
): Promise<TDocumentDefinitions> => {
  const pageById: Record<string, number> = {}
  const probe = build(new Set())
  probe.pageBreakBefore = (node) => {
    if (node.id) pageById[node.id] = node.pageNumbers[0]
    return false
  }
  await new Promise<void>((resolve) =>
    pdfMake.createPdf(probe).getBuffer(() => resolve()),
  )

  const splitKeys = new Set<string>()
  for (const id of Object.keys(pageById)) {
    if (!id.startsWith('signatories:')) continue
    const key = id.slice('signatories:'.length)
    const rowPage = pageById[keepRowId(key)]
    if (rowPage !== undefined && pageById[id] > rowPage) splitKeys.add(key)
  }
  return build(splitKeys)
}
