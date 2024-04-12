import { UserIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ProfilingSidebar() {
  const currentRoute = usePathname()

  return (
    <div className="px-2 mt-12">
      <ul className="space-y-2 border-gray-700">
        <li>
          <div className="flex items-center text-gray-500 font-semibold items-centers space-x-1 px-2">
            <UserIcon className="w-4 h-4" />
            <span>Profiling System</span>
          </div>
        </li>
        <li>
          <Link
            href="/profiling"
            className={`app__menu_link ${
              currentRoute === '/profiling' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">Profiles</span>
          </Link>
        </li>
        <li>
          <div className="flex items-center text-gray-500 font-semibold items-centers space-x-1 px-2">
            <span>Reports</span>
          </div>
        </li>
        <li>
          <Link
            href="/profilingreports"
            className={`app__menu_link ${
              currentRoute === '/profilingreports' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">Summary</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
