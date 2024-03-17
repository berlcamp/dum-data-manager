import { ListChecks } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TrackerSideBar() {
  const currentRoute = usePathname()

  return (
    <div className="px-2 mt-12">
      <ul className="space-y-2 border-gray-700">
        <li>
          <div className="flex items-center text-gray-500 font-semibold items-centers space-x-1 px-2">
            <ListChecks className="w-4 h-4" />
            <span>Letter Tracker</span>
          </div>
        </li>
        <li>
          <Link
            href="/lettertracker"
            className={`app__menu_link ${
              currentRoute === '/lettertracker' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">All Letters</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
