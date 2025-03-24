'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useEffect, useState } from 'react'

// Define data structure
interface Member {
  name: string
  id: number
  barangay: string
  parent?: string // Track hierarchy
}

// Function to generate a random 4-digit ID
const generateRandomID = (): number => Math.floor(1000 + Math.random() * 9000)

// Mock API function (replace with actual API call)
const fetchHouseholdLeaders = async (
  params: any,
  limit: number,
  offset: number
): Promise<{ data: Member[] }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: [
          {
            name: 'John Doe',
            id: generateRandomID(),
            barangay: 'San Pablo',
          },
          { name: 'Jane Smith', id: generateRandomID(), barangay: 'San Pablo' },
          {
            name: 'Alice Brown',
            id: generateRandomID(),
            barangay: 'San Pablo',
          },
          {
            name: 'Bob White ',
            id: generateRandomID(),
            barangay: 'San Pablo',
          },
          {
            name: 'Charlie Green',
            id: generateRandomID(),
            barangay: 'San Pablo',
          },
          { name: 'Daniel Lee', id: generateRandomID(), barangay: 'San Pablo' },
          {
            name: 'Emma Watson',
            id: generateRandomID(),
            barangay: 'San Pablo',
          },
          {
            name: 'Frank Adams',
            id: generateRandomID(),
            barangay: 'San Pablo',
          },
          { name: 'Grace Hall', id: generateRandomID(), barangay: 'San Pablo' },
          { name: 'Henry Ford', id: generateRandomID(), barangay: 'San Pablo' },
        ],
      })
    }, 1000)
  })
}

const TableToPDF: React.FC<{ barangay: string }> = ({ barangay }) => {
  const [list, setList] = useState<Member[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchHouseholdLeaders(
        { filterBarangay: barangay },
        9999,
        0
      )
      setList(result.data)
    }
    void fetchData()
  }, [barangay])

  const generatePDF = (): void => {
    const doc = new jsPDF()
    doc.text('Household Structure', 14, 10)

    const tableData: any[] = []

    // Pick one leader randomly
    const leader = list.length > 0 ? list[0] : null
    if (leader) {
      tableData.push([leader.name, leader.id, leader.barangay]) // Main leader row

      // Pick 5 random household leaders
      const householdLeaders = [...list]
        .sort(() => 0.5 - Math.random())
        .slice(1, 6) // Avoid leader duplication

      householdLeaders.forEach((hl) => {
        tableData.push([`         ${hl.name}`, hl.id, hl.barangay]) // Indented household leaders

        // Pick 5 random members under each household leader
        const members = [...list].sort(() => 0.5 - Math.random()).slice(0, 5)
        members.forEach((m) => {
          tableData.push([`                  ${m.name}`, m.id, m.barangay]) // Further indented members
        })
      })
    }

    autoTable(doc, {
      head: [['CHL   >   HL   > MEMBERS', 'ID Number', 'Barangay']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 12 },
    })

    doc.save('household_structure.pdf')
  }

  return (
    <div className="p-6 text-center">
      <button
        onClick={generatePDF}
        disabled={list.length === 0}
        className={`mt-4 px-4 py-2 rounded text-white ${
          list.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}>
        {list.length === 0 ? 'Loading...' : 'Download PDF'}
      </button>
    </div>
  )
}

export default TableToPDF
