import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (deptName.trim()) {
      onConfirm(deptName.trim())
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Summary by Department</DialogTitle>
            <DialogDescription>
              Enter the department name to print on the report.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-1.5">
            <Label htmlFor="ris-summary-dept">Department name</Label>
            <Input
              id="ris-summary-dept"
              autoFocus
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Municipal Engineering Office"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!deptName.trim()}>
              Generate PDF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
