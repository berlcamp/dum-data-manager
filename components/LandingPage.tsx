'use client'
import { TopBarDark } from '@/components/index'
import { useState } from 'react'
import FuelRequest from './FuelRequest'

export default function LandingPage() {
  const [requestFuel, setRequestFuel] = useState(false)

  return (
    <>
      <div className="app__landingpage">
        <TopBarDark isGuest={true} />
        <div className="mt-20">
          <FuelRequest />
        </div>
        <div className="mt-auto bg-gray-800 p-4 text-white fixed bottom-0 w-full">
          <div className="text-white text-center text-xs">&copy; DDM v1.0</div>
        </div>
      </div>
    </>
  )
}
