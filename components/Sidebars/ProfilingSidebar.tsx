import { useFilter } from '@/context/FilterContext'
import { Cog8ToothIcon } from '@heroicons/react/20/solid'
import { UserIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ProfilingSidebar() {
  const currentRoute = usePathname()
  const { hasAccess } = useFilter()

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
          <Link
            href="/profilingblc"
            className={`app__menu_link ${
              currentRoute === '/profilingblc' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">Coordinators</span>
          </Link>
        </li>
        <li>
          <Link
            href="/householdleaders"
            className={`app__menu_link ${
              currentRoute === '/householdleaders' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">
              Household Leaders
            </span>
          </Link>
        </li>
        <li>
          <div className="flex items-center text-gray-500 font-semibold items-centers space-x-1 px-2 mt-8">
            <span>Reports</span>
          </div>
        </li>
        <li>
          <Link
            href="/profilingreports"
            className={`app__menu_link ${
              currentRoute === '/profilingreports' ? 'app_menu_link_active' : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">
              Categories Summary
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/profilingreportsservices"
            className={`app__menu_link ${
              currentRoute === '/profilingreportsservices'
                ? 'app_menu_link_active'
                : ''
            }`}>
            <span className="flex-1 ml-3 whitespace-nowrap">
              Services Summary
            </span>
          </Link>
        </li>
        {hasAccess('profiling_admin') && (
          <>
            <li>
              <div className="flex items-center text-gray-500 font-semibold items-centers space-x-1 px-2 mt-8">
                <Cog8ToothIcon className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </li>
            <li>
              <Link
                href="/profilingsurveys"
                className={`app__menu_link ${
                  currentRoute === '/profilingsurveys'
                    ? 'app_menu_link_active'
                    : ''
                }`}>
                <span className="flex-1 ml-3 whitespace-nowrap">Surveys</span>
              </Link>
            </li>
            <li>
              <Link
                href="/profilingservices"
                className={`app__menu_link ${
                  currentRoute === '/profilingservices'
                    ? 'app_menu_link_active'
                    : ''
                }`}>
                <span className="flex-1 ml-3 whitespace-nowrap">Services</span>
              </Link>
            </li>

            <li>
              <Link
                href="/profilingimportexport"
                className={`app__menu_link ${
                  currentRoute === '/profilingimportexport'
                    ? 'app_menu_link_active'
                    : ''
                }`}>
                <span className="flex-1 ml-3 whitespace-nowrap">
                  Import/Export Data
                </span>
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  )
}
