'use client'

import UnitCodeInput from '@/components/UnitCodeInput'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReservationVehicleTypes } from '@/types'
import { fetchReservationVehicleByCode, normalizeUnitCode } from '@/utils/fetchApi'
import { AlertCircle, CalendarDays, Loader2, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface UnitCodeLookupProps {
  /**
   * Called with the resolved unit instead of navigating. The portal passes
   * this to render the schedule in place; the homepage omits it and the
   * visitor is sent to /portal.
   */
  onResolved?: (unit: ReservationVehicleTypes) => void
  initialCode?: string
  className?: string
}

/**
 * Shared entry point for the unit schedule portal: four boxes that resolve a
 * 4-character unit code. Used on the homepage and on /portal itself.
 */
export default function UnitCodeLookup({
  onResolved,
  initialCode = '',
  className,
}: UnitCodeLookupProps) {
  const router = useRouter()

  const [code, setCode] = useState(normalizeUnitCode(initialCode))
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)

  const lookup = async (raw: string) => {
    const cleaned = normalizeUnitCode(raw)
    if (cleaned.length !== 4) return

    setSearching(true)
    setNotFound(false)
    try {
      const found = await fetchReservationVehicleByCode(cleaned)

      if (!found) {
        setNotFound(true)
        return
      }

      if (onResolved) {
        onResolved(found)
      } else {
        router.push(`/portal?code=${cleaned}`)
      }
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <UnitCodeInput
        value={code}
        onChange={(next) => {
          setCode(next)
          setNotFound(false)
        }}
        onComplete={(next) => void lookup(next)}
        disabled={searching}
        invalid={notFound}
      />

      <div className="mt-6">
        <Button
          type="button"
          className="w-full"
          disabled={code.length !== 4 || searching}
          onClick={() => void lookup(code)}>
          {searching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Looking up…
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              View schedule
            </>
          )}
        </Button>
      </div>

      {notFound && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No unit uses the code <strong>{code}</strong>. Check the code and try
            again.
          </span>
        </div>
      )}
    </div>
  )
}

/** The heading block shown above the code boxes on both surfaces. */
export function UnitCodeLookupHeading({ compact }: { compact?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={cn(
          'mx-auto mb-4 flex items-center justify-center rounded-2xl bg-primary/10',
          compact ? 'h-11 w-11' : 'h-14 w-14'
        )}>
        <CalendarDays
          className={cn('text-primary', compact ? 'h-5 w-5' : 'h-7 w-7')}
        />
      </div>
      <h2
        className={cn(
          'font-bold text-gray-900',
          compact ? 'text-xl uppercase' : 'text-2xl sm:text-3xl'
        )}>
        Unit Schedule Portal
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Enter the 4-character code printed on the unit to see when it is booked.
      </p>
    </div>
  )
}
