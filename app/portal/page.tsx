import type { Metadata } from 'next'
import Main from './Main'

export const metadata: Metadata = {
  title: 'Unit Schedule Portal | DDM',
  description: 'Check when a reservation unit is booked using its 4-character code.',
}

export default function Page({
  searchParams,
}: {
  searchParams: { code?: string }
}) {
  return <Main initialCode={searchParams.code ?? ''} />
}
