'use client'

import { Unauthorized } from '@/components/index'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { redirect } from 'next/navigation'

export default function PmsLayout({ children }: { children: React.ReactNode }) {
  const { hasAccess } = useFilter()
  const { session } = useSupabase()

  if (!session) {
    redirect('/')
  }

  // Check access from permission settings or Super Admins
  if (!hasAccess('settings') && !superAdmins.includes(session.user.email))
    return <Unauthorized />

  return <>{children}</>
}
