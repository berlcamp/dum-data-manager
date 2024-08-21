'use client'

import { Sidebar, TopBar, Unauthorized } from '@/components/index'
import React from 'react'

// Types

// Redux imports
import ProfilingSidebar from '@/components/Sidebars/ProfilingSidebar'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { CategorySummary } from './CategorySummary'
import { SurveyChart } from './SurveyChart'

const CategoryCount = ({
  category,
  core,
  blc,
  prov,
}: {
  category: string
  core: number
  blc: number
  prov: number
}) => {
  return (
    <div className="hover:bg-slate-200 text-gray-700">
      <div className="p-2">
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 bg-gray-500 text-white rounded-full flex items-center justify-center">
            {category}
          </div>
        </div>
        <div className="pl-10 mt-2 font-extralight">
          <span className="text-sm">Core: </span>
          <span className="font-bold">{core}</span>
        </div>
        <div className="pl-10 font-extralight">
          <span className="text-sm">BLC: </span>
          <span className="font-bold">{blc}</span>
        </div>
        <div className="pl-10 font-extralight">
          <span className="text-sm">Province: </span>
          <span className="font-bold">{prov}</span>
        </div>
      </div>
    </div>
  )
}
const Page: React.FC = () => {
  //
  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('profiling') && !superAdmins.includes(email))
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <ProfilingSidebar />
      </Sidebar>
      <div className="app__main">
        <div>
          {/* Header */}
          <TopBar />

          <div>
            <div className="mx-4 grid md:grid-cols-2 gap-2">
              <SurveyChart />
              <CategorySummary />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default Page
