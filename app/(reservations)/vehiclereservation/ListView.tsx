import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { reservationStatusColors } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ReservationTypes } from '@/types'
import { compareAsc, compareDesc, format } from 'date-fns'

interface ListViewProps {
  data: ReservationTypes[]
  onEdit: (item: ReservationTypes) => void
  sortFromLatest?: boolean
}

export default function ListView({ data, onEdit, sortFromLatest }: ListViewProps) {
  const sorted = [...data].sort((a, b) =>
    sortFromLatest
      ? compareDesc(new Date(a.date ?? ''), new Date(b.date ?? ''))
      : compareAsc(new Date(a.date ?? ''), new Date(b.date ?? ''))
  )

  const grouped = sorted.reduce<Record<string, ReservationTypes[]>>((acc, a) => {
    const key = a.date ? format(new Date(a.date), 'yyyy-MM-dd') : 'no-date'
    acc[key] = acc[key] || []
    acc[key].push(a)
    return acc
  }, {})

  if (Object.keys(grouped).length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No reservations found
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, items]) => (
        <Card key={date} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-muted/50 px-6 py-4 border-b">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-bold text-primary">
                  {date !== 'no-date' ? format(new Date(date), 'd') : '—'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {date !== 'no-date'
                    ? format(new Date(date), 'EEEE, MMMM d, yyyy')
                    : 'No Date'}
                </div>
              </div>
            </div>
            <div className="divide-y">
              {items.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full p-4 hover:bg-accent/50 transition-colors text-left flex justify-between items-start gap-4"
                  onClick={() => onEdit(a)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mb-1">
                      {a.requester} / {a.department}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      {a.time && <span>{a.time}</span>}
                      {a.vehicle && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span>
                            {a.vehicle.name}
                            {a.vehicle.plate_number
                              ? ` (${a.vehicle.plate_number})`
                              : ''}
                          </span>
                        </>
                      )}
                      {a.purpose && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{a.purpose}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0',
                      reservationStatusColors[a.status] ||
                        'border-muted bg-muted text-muted-foreground'
                    )}
                  >
                    {a.status || '—'}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
