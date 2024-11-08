import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceRoleKey = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY ?? ''

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data } = await supabase
    .from('ddm_profile_remarks')
    .select('*, profile:profile_id(id, fullname)')

  const upsertData: Array<{
    id: string
    new_profile_id: string
  }> = []

  for (const d of data || []) {
    if (d.profile) {
      const { data: findName } = await supabase
        .from('ddm_profiles_duplicate')
        .select('id, fullname')
        .eq('fullname', d.profile.fullname)
        .maybeSingle()

      if (findName) {
        const obj = { id: d.id!, new_profile_id: findName.id }
        upsertData.push(obj)
      }
    }
  }

  console.log('upsertData', upsertData.length)
  const { error } = await supabase
    .from('ddm_profile_remarks')
    .upsert(upsertData)

  if (error) {
    return NextResponse.json(error)
  } else {
    return NextResponse.json('Cron completed')
  }
}
