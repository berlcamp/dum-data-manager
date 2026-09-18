import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { superAdmins } from '@/constants/TrackerConstants'
import { type AccountTypes } from '@/types'
import { createServerClient } from '@/utils/supabase-server'

// Creating accounts and resetting passwords needs the service role, which must
// never reach the browser. The account modal calls this route instead.
//
// The service role bypasses RLS, so every handler below is gated on the same
// rule the accounts page enforces: the caller must be a super admin.
const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

// getUser() rather than getSession(): it verifies the token with the auth
// server instead of trusting whatever the cookie says.
const denyNonSuperAdmin = async () => {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !superAdmins.includes(user.email)) {
    return NextResponse.json(
      { error_message: 'You are not allowed to manage accounts.' },
      { status: 403 },
    )
  }

  return null
}

export async function POST(req: NextRequest) {
  const denied = await denyNonSuperAdmin()
  if (denied) return denied

  const { item }: { item: AccountTypes } = await req.json()

  if (!item?.email || !item?.temp_password) {
    return NextResponse.json({ error_message: 'Email is required.' })
  }

  const supabase = serviceClient()

  // Signed up on the server side to fix a pkce issue
  // https://github.com/supabase/auth-helpers/issues/569
  const { data: signUpData, error } = await supabase.auth.admin.createUser({
    email: item.email,
    password: item.temp_password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error_message: error.message })
  }

  const id = signUpData.user.id

  const { error: insertError } = await supabase
    .from('ddm_users')
    .insert({ ...item, id })

  if (insertError) {
    // Leave no auth user behind that the app has no row for.
    await supabase.auth.admin.deleteUser(id)
    return NextResponse.json({ error_message: insertError.message })
  }

  return NextResponse.json({ error_message: '', insert_id: id })
}

export async function PATCH(req: NextRequest) {
  const denied = await denyNonSuperAdmin()
  if (denied) return denied

  const {
    id,
    item,
    password,
  }: { id: string; item: Partial<AccountTypes>; password?: string } =
    await req.json()

  if (!id) {
    return NextResponse.json({ error_message: 'Account id is required.' })
  }

  const supabase = serviceClient()

  const { error } = await supabase.from('ddm_users').update(item).eq('id', id)

  if (error) {
    return NextResponse.json({ error_message: error.message })
  }

  if (password && password !== '') {
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      id,
      { password },
    )

    if (passwordError) {
      return NextResponse.json({ error_message: passwordError.message })
    }
  }

  return NextResponse.json({ error_message: '' })
}
