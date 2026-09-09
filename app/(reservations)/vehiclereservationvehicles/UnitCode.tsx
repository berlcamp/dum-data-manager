'use client'

import { Check, Copy, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface UnitCodeProps {
  code: string | null
}

/**
 * The unit's portal code, with a one-click copy and a link that opens the
 * public schedule portal already resolved to this unit.
 */
export default function UnitCode({ code }: UnitCodeProps) {
  const [copied, setCopied] = useState(false)

  if (!code) return <span className="text-gray-400">—</span>

  const handleCopy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex items-center space-x-1">
      <span className="rounded bg-gray-800 px-2 py-1 font-mono text-xs font-bold tracking-widest text-white">
        {code}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy code"
        className="p-1 text-gray-500 hover:text-gray-800">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <Link
        href={`/portal?code=${code}`}
        target="_blank"
        title="Open in schedule portal"
        className="p-1 text-gray-500 hover:text-gray-800">
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
