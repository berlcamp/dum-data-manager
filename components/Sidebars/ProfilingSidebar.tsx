import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ProfilingSidebar() {
  const currentRoute = usePathname()

  return (
    <div className="px-2 mt-12">
      <ul className="space-y-2 border-gray-700">
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
