import { Sidebar, Title, TopBar, TwoColTableLoading } from '@/components/index'

export default function Loading() {
  return (
    <>
      <Sidebar>
        <></>
      </Sidebar>
      <div className="app__main">
        <TopBar />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 mt-4 dark:border-gray-700">
          <div>
            <Title title="Department Allocations" />
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Fuel budgets per department, and how much of each is consumed
            </p>
          </div>
        </div>
        <div
          role="status"
          aria-label="Loading Department Allocations">
          <TwoColTableLoading />
        </div>
      </div>
    </>
  )
}
