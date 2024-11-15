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
import { barangays } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { useEffect, useState } from 'react'

export function SurveyChart() {
  // Filters
  const [filterBarangay, setFilterBarangay] = useState('All')
  const [filterType, setFilterType] = useState('Core')

  // Chart data
  const [dataSets, setDataSets] = useState<any>([])
  const [labels, setLabels] = useState<any>([])

  // Loading
  const [loading, setLoading] = useState(false)

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const fetchData = async () => {
    setLoading(true)

    const { data, error } = await supabase.rpc('surveys_with_count', {
      param_type: filterType,
      param_barangay: filterBarangay,
    })

    if (error) {
      console.error(error)
    }

    const chartData = data

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
      a: {
        label: 'A',
        color: `${colors[i++]}`,
      },
      b: {
        label: 'B',
        color: `${colors[i++]}`,
      },
      c: {
        label: 'C',
        color: `${colors[i++]}`,
      },
      d: {
        label: 'D',
        color: `${colors[i++]}`,
      },
      inc: {
        label: 'INC',
        color: `${colors[i++]}`,
      },
      uc: {
        label: 'UC',
        color: `${colors[i++]}`,
      },
    } satisfies ChartConfig

    setDataSets(chartData)
    setLabels(chartConfig)
    setLoading(false)
  }

  // Featch data
  useEffect(() => {
    void fetchData()
  }, [filterType, filterBarangay])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison of Category Across Survey Batches</CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
        <div className="py-4">
          <div className="flex space-x-2">
            <div>
              <div className="app__label_standard">Barangay</div>
              <div>
                <select
                  value={filterBarangay}
                  onChange={(e) => setFilterBarangay(e.target.value)}
                  className="app__input_standard">
                  <option value="All">All</option>
                  {barangays.map((bar: string, i: number) => (
                    <option
                      key={i}
                      value={bar}>
                      {bar}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="app__label_standard">Category Type</div>
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="app__input_standard">
                  <option value="Core">Core</option>
                  <option value="BLC">BLC</option>
                  <option value="Province">Province</option>
                </select>
              </div>
            </div>
          </div>
        </div>
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
              tickFormatter={(value) => value.slice(0, 30)}
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
