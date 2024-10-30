import Footer from '@/components/Footer'
import FuelRequest from '@/components/FuelRequest'
import { TopBarDark } from '@/components/index'
import { createServerClient } from '@/utils/supabase-server'

export default async function Page() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return (
    <>
      <div className="app__home">
        <TopBarDark isGuest={session ? false : true} />
        <div className="border-b mt-20">
          <FuelRequest />
        </div>
        <Footer />
      </div>
    </>
  )
}
