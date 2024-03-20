import { Cog8ToothIcon } from '@heroicons/react/20/solid'
import { ListChecks } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function RisSidebar() {
  const currentRoute = usePathname()

  return (
    <div className="px-2 mt-12">
      <ul className="space-y-2 border-gray-700">
        <li>
          <div className="flex items-center text-gray-500 font-semibold items-centers space-x-1 px-2">
            <ListChecks className="w-4 h-4" />
            <span>R.I.S.</span>
          </div>
        </li>
        <li>
          <Link
            href="/rispo"
            className={`app__menu_link ${
              currentRoute === '/rispo' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">
              Purchase Orders
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/ris"
            className={`app__menu_link ${
              currentRoute === '/ris' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">
              Requisition & Issue Slip
            </span>
          </Link>
        </li>
        <li>
          <div className="flex items-center text-gray-500 font-semibold items-centers space-x-1 px-2">
            <Cog8ToothIcon className="w-4 h-4" />
            <span>Settings</span>
          </div>
        </li>
        <li>
          <Link
            href="/risvehicles"
            className={`app__menu_link ${
              currentRoute === '/risvehicles' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">Vehicles</span>
          </Link>
        </li>
        <li>
          <Link
            href="/risdepartments"
            className={`app__menu_link ${
              currentRoute === '/risdepartments' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">Departments</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
