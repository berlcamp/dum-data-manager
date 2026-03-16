import { Card, CardContent } from '@/components/ui/card'

interface StatWidgetProps {
  label: string
  value: string | number
  className?: string
}

export default function StatWidget({ label, value, className = '' }: StatWidgetProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}
