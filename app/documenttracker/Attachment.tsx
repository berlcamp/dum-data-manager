import { useSupabase } from '@/context/SupabaseProvider'
import { PaperclipIcon } from 'lucide-react'
import { useState } from 'react'

export default function Attachment({ id, file }: { id: string; file: string }) {
  const [downloading, setDownloading] = useState(false)
  const { supabase } = useSupabase()

  const handleDownloadFile = async (file: string) => {
    if (downloading) return

    setDownloading(true)

    const { data, error } = await supabase.storage
      .from('ddm_documents')
      .download(`letter_tracker/${id}/${file}`)

    if (error) console.error(error)

    const url = window.URL.createObjectURL(new Blob([data]))

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', file)
    document.body.appendChild(link)
    link.click()
    link.remove()

    setDownloading(false)
  }

  return (
    <div
      onClick={() => handleDownloadFile(file)}
      className={`flex space-x-2 items-center ${
        downloading ? '' : 'cursor-pointer'
      }`}>
      <PaperclipIcon className="w-4 h-4 text-blue-700 " />
      <span className="text-blue-700 font-medium text-[10px]">
        {file}
        {downloading ? ' downloading...' : ''}
      </span>
    </div>
  )
}
