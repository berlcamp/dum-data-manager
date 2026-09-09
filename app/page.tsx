import Footer from '@/components/Footer'
import FuelRequest from '@/components/FuelRequest'
import UnitCodeLookup, {
  UnitCodeLookupHeading,
} from '@/components/UnitCodeLookup'
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
        <div className="border-b">
          <div className="mt-12 flex mb-20 flex-col space-y-6 items-center px-4">
            <UnitCodeLookupHeading compact />
            <div className="w-full max-w-md border bg-white p-6">
              <UnitCodeLookup />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  )
}
