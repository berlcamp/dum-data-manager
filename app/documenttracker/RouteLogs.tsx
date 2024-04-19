import { updateRoutesList } from '@/GlobalRedux/Features/routesSlice'
import { TwoColTableLoading } from '@/components/index'
import { useSupabase } from '@/context/SupabaseProvider'
import { DocumentFlowchartTypes, DocumentTypes } from '@/types'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

export default function RouteLogs({
  documentData,
}: {
  documentData: DocumentTypes
}) {
  const [routeLists, setRouteLists] = useState<DocumentFlowchartTypes[] | []>(
    []
  )

  const [loading, setLoading] = useState(false)

  const { supabase } = useSupabase()

  // Redux staff
  const globalRoutesList = useSelector((state: any) => state.routes.value)
  const reloadLogs = useSelector((state: any) => state.recount.value)
  const dispatch = useDispatch()

  useEffect(() => {
    // Fetch remarks
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('ddm_tracker_routes')
        .select()
        .eq('tracker_id', documentData.id)

      // update the list in redux
      dispatch(updateRoutesList(data))

      setLoading(false)
    })()
  }, [reloadLogs])

  // Update list whenever list in redux updates
  useEffect(() => {
    setRouteLists(globalRoutesList)
  }, [globalRoutesList])

  const isDataEmpty =
    !Array.isArray(routeLists) || routeLists.length < 1 || !routeLists

  return (
    <div>
      <div className="mb-6 px-4">
        <span className="font-bold text-xs">Route Logs</span>
      </div>
      {loading && <TwoColTableLoading />}
      {!loading && (
        <div className="w-full text-xs">
          {!isDataEmpty &&
            routeLists.map((item, index) => (
              <div
                key={index}
                className="flex">
                <div
                  className={`px-4 ${
                    index === 0 || index + 1 < routeLists.length
                      ? 'border-r-2 border-gray-600 border-dashed'
                      : ''
                  }`}>
                  <div>{format(new Date(item.date), 'dd MMM yyyy')}</div>
                  <div>{item.time}</div>
                </div>
                <div className="relative">
                  <span
                    className={`absolute -top-1 ${
                      index === 0 || index + 1 < routeLists.length
                        ? '-left-[11px]'
                        : '-left-[9px]'
                    } inline-flex items-center justify-center border border-gray-600 rounded-full bg-white w-5 h-5`}>
                    <span className="rounded-full px-1 text-white text-xs"></span>
                  </span>
                </div>
                <div
                  className={`${
                    routeLists.length > 1 && index + 1 < routeLists.length
                      ? 'text-gray-500 font-light'
                      : 'text-gray-700 font-bold'
                  } flex-1 ml-8 pb-4`}>
                  <div>{item.title}</div>
                  <div>
                    {item.message &&
                      Array.isArray(item.message) &&
                      item.message.map((message: any, idx: number) => (
                        <div
                          key={idx}
                          className="font-light">
                          <span>{message.field} updated from </span>
                          <span className="font-medium">{message.before}</span>
                          <span> to </span>
                          <span className="font-medium">{message.after}</span>
                        </div>
                      ))}
                  </div>
                  <div className="font-medium">by {item.user}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
