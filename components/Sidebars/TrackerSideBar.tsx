import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TrackerSideBar() {
  const currentRoute = usePathname()

  return (
    <div className="px-2 mt-12">
      <ul className="space-y-2 border-gray-700">
        <li>
          <Link
            href="/documenttracker"
            className={`app__menu_link ${
              currentRoute === '/documenttracker' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">All Documents</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
