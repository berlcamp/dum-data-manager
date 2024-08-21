'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { ServicesListTypes } from '@/types'
import { useEffect, useState } from 'react'

export function SurveyChart() {
  // Chart data
  const [dataSets, setDataSets] = useState<any>([])
  const [labels, setLabels] = useState<any>([])

  // Loading
  const [loading, setLoading] = useState(false)

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const fetchData = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('ddm_profile_services')
      .select(`*, services_availed:ddm_profile_services_availed(count)`)

    if (error) {
      console.error(error)
    }

    const transformedData = data.map((item: ServicesListTypes) => ({
      name: item.name,
      count: item.services_availed[0].count,
    }))

    const chartData = transformedData

    const colors = [
      '#0cb5d6',
      '#7c99c1',
      '#c3ffad',
      '#4e4957',
      '#0cb5d6',
      '#082957',
      '#1a3c6b',
      '#c3ffad',
      '#4e4957',
      '#b49cde',
      '#a381df',
      '#7b4fc8',
    ]

    let i = 0

    const chartConfig = {
      count: {
        label: 'Total Beneficiaries',
        color: 'hsl(var(--chart-1))',
      },
    } satisfies ChartConfig

    setDataSets(chartData)
    setLabels(chartConfig)
    setLoading(false)
  }

  // Featch data
  useEffect(() => {
    void fetchData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Total Beneficiaries Per Services </CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
      </CardHeader>
      <CardContent>
        <ChartContainer config={labels}>
          <BarChart
            accessibilityLayer
            data={dataSets}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 100)}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.keys(labels).map((key, i) => (
              <Bar
                key={i}
                dataKey={key}
                stackId="a"
                barSize={20}
                fill={labels[key].color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  )
}
