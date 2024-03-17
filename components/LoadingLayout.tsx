import { Sidebar, Title, TopBar, TwoColTableLoading } from '@/components/index'

interface PageProps {
  title: string
}

console.log('loading.ts loaded')

export default function Loading({ title }: PageProps) {
  return (
    <>
      <Sidebar>
        <></>
      </Sidebar>

      <div className="app__main">
        <div className="app__title">
          <Title title={title} />
        </div>
        <TopBar />
        <TwoColTableLoading />
      </div>
    </>
  )
}
