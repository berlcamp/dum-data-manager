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
          <Title title="Departments" />
        </div>
        <TwoColTableLoading />
      </div>
    </>
  )
}
