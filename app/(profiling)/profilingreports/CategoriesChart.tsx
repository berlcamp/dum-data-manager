'use client'

import { ChartDataSetTypes } from '@/types'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Title as ChartTitle,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
)

interface PagePros {
  labels: string[]
  dataSets: ChartDataSetTypes[]
}
export default function CategoriesChart({ labels, dataSets }: PagePros) {
  const formatedDataSets = dataSets.map((d) => {
    return {
      label: d.label,
      data: d.data,
      backgroundColor: d.bgColor,
      borderWidth: 1,
    }
  })
  const data = {
    labels: labels,
    datasets: formatedDataSets,
  }

  const options = {
    plugins: {
      title: {
        display: true,
        text: 'Chart.js Bar Chart - Stacked',
      },
    },
    responsive: true,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
      },
    },
  }

  return (
    <Bar
      data={data}
      options={options}
    />
  )
}
