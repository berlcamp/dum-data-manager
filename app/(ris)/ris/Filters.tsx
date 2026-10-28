import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSupabase } from '@/context/SupabaseProvider'
import { useFilter } from '@/context/FilterContext'
import {
  RisAppropriationTypes,
  RisCaTypes,
  RisDepartmentTypes,
  RisPoTypes,
  RisVehicleTypes,
} from '@/types'
import { Filter, Lock, LockOpen, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterAppropriation: (a: string) => void
  setFilterVehicle: (a: string) => void
  setFilterStatus: (status: string) => void
  setFilterDepartment: (d: string) => void
  setFilterCa: (ca: string) => void
  setFilterPo: (po: string) => void
  setFilterDateFrom: (date: Date | undefined) => void
  setFilterDateTo: (date: Date | undefined) => void
  setFilterKeyword: (keyword: string) => void
  setFilterThreshold: (v: string) => void
  filterDateFrom?: Date | undefined
  filterDateTo?: Date | undefined
  onMarkAsLock?: () => void
  onMarkAsUnlock?: () => void
  isSuperAdmin?: boolean
  filteredCount?: number
}

const FormSchema = z.object({
  keyword: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  appropriation: z.string().optional(),
  vehicle: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  purchase_order: z.string().optional(),
  cash_advance: z.string().optional(),
  threshold: z.string().optional(),
})

const Filters = ({
  setFilterCa,
  setFilterPo,
  setFilterAppropriation,
  setFilterVehicle,
  setFilterStatus,
  setFilterDepartment,
  setFilterDateFrom,
  setFilterDateTo,
  setFilterKeyword,
  setFilterThreshold,
  filterDateFrom,
  filterDateTo,
  onMarkAsLock,
  onMarkAsUnlock,
  isSuperAdmin,
  filteredCount,
}: FilterTypes) => {
  const [lockAction, setLockAction] = useState<'lock' | 'unlock' | null>(
    null,
  )
  const [appropriations, setAppropriations] = useState<
    RisAppropriationTypes[] | []
  >([])
  const [departments, setDepartments] = useState<RisDepartmentTypes[] | []>([])
  const [purchaseOrders, setPurchaseOrders] = useState<RisPoTypes[] | []>([])
  const [cashAdvances, setCashAdvances] = useState<RisCaTypes[] | []>([])
  const [vehicles, setVehicles] = useState<RisVehicleTypes[] | []>([])

  const { supabase, session, currentUser } = useSupabase()
  const { hasAccess } = useFilter()
  const hasRisAdminAccess = hasAccess('ris_admin')

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: {
      dateFrom: '',
      dateTo: '',
      appropriation: '',
      vehicle: '',
      status: '',
      department: '',
      purchase_order: '',
      cash_advance: '',
      keyword: '',
      threshold: '',
    },
  })

  // A P.O. belongs to an appropriation, so picking one narrows the P.O. list
  // to that appropriation instead of every P.O. in the system.
  const selectedAppropriation = form.watch('appropriation')

  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    if (!selectedAppropriation || selectedAppropriation === 'All') return true
    return (po.appropriation?.toString() ?? '') === selectedAppropriation
  })

  // Department users only get the appropriations their own department
  // allocations draw from (purchaseOrders is already limited to their
  // department for them).
  const departmentAppropriations = (appropriations || []).filter((a) =>
    purchaseOrders.some(
      (po) => (po.appropriation?.toString() ?? '') === a.id.toString(),
    ),
  )

  // The P.O. picked earlier may not belong to the appropriation just chosen —
  // clear it rather than leave the dropdown showing a value it no longer lists.
  useEffect(() => {
    const currentPo = form.getValues('purchase_order')
    if (!currentPo) return
    if (!filteredPurchaseOrders.some((po) => po.id.toString() === currentPo)) {
      form.setValue('purchase_order', '')
    }
  }, [selectedAppropriation])

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterPo(data.purchase_order || 'All')
    setFilterDateFrom(data.dateFrom ? new Date(data.dateFrom) : undefined)
    setFilterDateTo(data.dateTo ? new Date(data.dateTo) : undefined)
    setFilterKeyword(data.keyword || '')
    setFilterAppropriation(data.appropriation || 'All')
    
    // Only set admin-only filters if user has ris_admin access
    if (hasRisAdminAccess) {
      setFilterCa(data.cash_advance || 'All')
      setFilterVehicle(data.vehicle || 'All')
      setFilterStatus(data.status || 'All')
      setFilterDepartment(data.department || 'All')
      setFilterThreshold(data.threshold || '')
    } else {
      // Reset admin-only filters for non-admin users
      setFilterCa('All')
      setFilterVehicle('All')
      setFilterStatus('All')
      setFilterDepartment('All')
      setFilterThreshold('')
    }
  }

  // clear all filters
  const handleClear = () => {
    form.reset()
    setFilterPo('All')
    setFilterCa('All')
    setFilterAppropriation('All')
    setFilterVehicle('All')
    setFilterStatus('All')
    setFilterDepartment('All')
    setFilterDateFrom(undefined)
    setFilterDateTo(undefined)
    setFilterKeyword('')
    setFilterThreshold('')
  }

  useEffect(() => {
    // Fetch Appropriations
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_appropriations')
        .select()
        .order('name', { ascending: true })
      setAppropriations(data)
    })()
    // Fetch Departments
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_departments')
        .select()
        .order('name', { ascending: true })
      setDepartments(data)
    })()
    // Fetch POs - filter by user access
    ;(async () => {
      if (!session?.user?.email) return

      // Admin emails that can see all records
      const adminEmails = ['arfel@ddm.com', 'berlcamp@gmail.com']
      const isAdmin =
        adminEmails.includes(session.user.email) || hasRisAdminAccess

      // For non-admin users, filter by department_id
      if (!isAdmin) {
        if (currentUser?.department_id) {
          const { data, error } = await supabase
            .from('ddm_ris_purchase_orders')
            .select()
            .eq('department_id', currentUser.department_id)
            .order('po_number', { ascending: true })
          setPurchaseOrders(data || [])
        } else {
          // No department_id available, show empty list
          setPurchaseOrders([])
        }
      } else {
        // Admin users see all Purchase Orders
        const { data } = await supabase
          .from('ddm_ris_purchase_orders')
          .select()
          .order('po_number', { ascending: true })
        setPurchaseOrders(data || [])
      }
    })()
    // Fetch CAa
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_cash_advances')
        .select()
        .order('ca_number', { ascending: true })
      setCashAdvances(data)
    })()
    // Fetch vehicles
    ;(async () => {
      let query = supabase
        .from('ddm_ris_vehicles')
        .select()

      // Filter by department if user doesn't have ris_admin access
      if (!hasRisAdminAccess && currentUser?.department_id) {
        // First try to filter by department_id if the field exists
        query = query.eq('department_id', currentUser.department_id)
      }

      const { data } = await query.order('name', { ascending: true })
      
      // If no results and user doesn't have admin access, try filtering by vehicles used in RIS records for their department
      if (!hasRisAdminAccess && currentUser?.department_id && (!data || data.length === 0)) {
        const { data: risData } = await supabase
          .from('ddm_ris')
          .select('vehicle_id')
          .eq('department_id', currentUser.department_id)
        
        if (risData && risData.length > 0) {
          const vehicleIds = Array.from(new Set(risData.map((ris: { vehicle_id: string }) => ris.vehicle_id).filter(Boolean)))
          if (vehicleIds.length > 0) {
            const { data: vehicleData } = await supabase
              .from('ddm_ris_vehicles')
              .select()
              .in('id', vehicleIds)
              .order('name', { ascending: true })
            setVehicles(vehicleData || [])
            return
          }
        }
      }
      
      setVehicles(data || [])
    })()
  }, [session?.user?.email, currentUser?.department_id, hasRisAdminAccess])

  type SelectFieldName =
    | 'purchase_order'
    | 'cash_advance'
    | 'department'
    | 'appropriation'
    | 'vehicle'
    | 'status'

  // Every dropdown starts with "All" so a single filter can be undone without
  // clearing the rest
  const renderSelect = (
    name: SelectFieldName,
    label: string,
    options: { value: string; label: string }[],
    emptyText?: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel className="app__form_label">{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value != null ? field.value.toString() : ''}>
            <FormControl>
              <SelectTrigger className="h-9 bg-white dark:bg-gray-900">
                <SelectValue placeholder="All" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {options.length === 0 && emptyText && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {emptyText}
                </div>
              )}
              {options.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  )

  const watched = form.watch()
  const activeFilterCount = Object.entries(watched).filter(
    ([key, value]) =>
      (hasRisAdminAccess ||
        [
          'keyword',
          'dateFrom',
          'dateTo',
          'appropriation',
          'purchase_order',
        ].includes(key)) &&
      value !== undefined &&
      value !== '' &&
      value !== 'All',
  ).length

  const confirmLockAction = () => {
    if (lockAction === 'lock') onMarkAsLock?.()
    if (lockAction === 'unlock') onMarkAsUnlock?.()
    setLockAction(null)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <FormField
              control={form.control}
              name="keyword"
              render={({ field }) => (
                <FormItem className="min-w-0 sm:col-span-2">
                  <FormLabel className="app__form_label">Search</FormLabel>
                  <div className="relative">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      placeholder="Requester or purpose"
                      className="h-9 bg-white pl-8 dark:bg-gray-900"
                      {...field}
                    />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateFrom"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="app__form_label">Date From</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 bg-white dark:bg-gray-900"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateTo"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="app__form_label">Date To</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 bg-white dark:bg-gray-900"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {!hasRisAdminAccess && (
              <div className="min-w-0 sm:col-span-2">
                {renderSelect(
                  'appropriation',
                  'Appropriation',
                  departmentAppropriations.map((a) => ({
                    value: a.id.toString(),
                    label: a.name,
                  })),
                  'No appropriation for your department',
                )}
              </div>
            )}
            <div className="min-w-0 sm:col-span-2">
              {renderSelect(
                'purchase_order',
                'Department Allocation',
                filteredPurchaseOrders.map((a) => ({
                  value: a.id.toString(),
                  label: a.po_number,
                })),
                'No Department Allocation for this appropriation',
              )}
            </div>
            {hasRisAdminAccess && (
              <>
                {renderSelect(
                  'appropriation',
                  'Appropriation',
                  (appropriations || []).map((a) => ({
                    value: a.id.toString(),
                    label: a.name,
                  })),
                )}
                {renderSelect(
                  'department',
                  'Department',
                  (departments || []).map((d) => ({
                    value: d.id.toString(),
                    label: d.name,
                  })),
                )}
                {renderSelect(
                  'vehicle',
                  'Vehicle',
                  (vehicles || []).map((v) => ({
                    value: v.id.toString(),
                    label: `${v.name} - ${v.plate_number}`,
                  })),
                )}
                {renderSelect(
                  'cash_advance',
                  'C.A.',
                  (cashAdvances || []).map((c) => ({
                    value: c.id.toString(),
                    label: c.ca_number,
                  })),
                )}
                {renderSelect('status', 'Status', [
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Approved', label: 'Approved' },
                ])}
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className="app__form_label">
                        Amount Threshold
                      </FormLabel>
                      <Input
                        placeholder="e.g. 5000"
                        className="h-9 bg-white dark:bg-gray-900"
                        type="number"
                        inputMode="decimal"
                        {...field}
                      />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Filter
                aria-hidden="true"
                className="mr-1.5 h-4 w-4"
              />
              Apply Filters
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClear}
              disabled={activeFilterCount === 0}>
              <X
                aria-hidden="true"
                className="mr-1.5 h-4 w-4"
              />
              Clear
              {activeFilterCount > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {isSuperAdmin && onMarkAsLock && onMarkAsUnlock && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLockAction('lock')}>
                  <Lock
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4"
                  />
                  Lock Filtered
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLockAction('unlock')}>
                  <LockOpen
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4"
                  />
                  Unlock Filtered
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>

      {/* Lock/Unlock touches every record matching the filters, not only the
          rows on screen, so it asks first */}
      <Dialog
        open={lockAction !== null}
        onOpenChange={(open) => !open && setLockAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lockAction === 'lock'
                ? 'Lock filtered R.I.S.?'
                : 'Unlock filtered R.I.S.?'}
            </DialogTitle>
            <DialogDescription>
              This will {lockAction === 'lock' ? 'lock' : 'unlock'} every
              R.I.S. that matches the current filters
              {filteredCount !== undefined ? ` (${filteredCount})` : ''}, not
              just the rows shown on this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLockAction(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmLockAction}>
              {lockAction === 'lock' ? 'Lock' : 'Unlock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Filters
