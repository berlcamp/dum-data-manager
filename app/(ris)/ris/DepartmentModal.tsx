import { useState } from 'react'

interface DepartmentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deptName: string) => void
}

export default function DepartmentModal({
  isOpen,
  onClose,
  onConfirm,
}: DepartmentModalProps) {
  const [deptName, setDeptName] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed z-50 inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-[400px]">
        <h2 className="text-lg font-bold mb-4">Enter Department Name</h2>
        <input
          type="text"
          value={deptName}
          onChange={(e) => setDeptName(e.target.value)}
          className="w-full border rounded p-2 mb-4"
          placeholder="Department name"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
          <button
            onClick={() => {
              if (deptName.trim()) {
                onConfirm(deptName.trim())
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
