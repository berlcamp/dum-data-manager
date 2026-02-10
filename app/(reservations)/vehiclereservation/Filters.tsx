'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { ReservationVehicleTypes } from '@/types'
import { Filter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterKeyword: (keyword: string) => void
  setFilterVehicle: (vehicle: string) => void
  filterKeyword?: string
  filterVehicle?: string
}

const FormSchema = z.object({
  keyword: z.string().optional(),
  vehicle: z.string().optional(),
})

const Filters = ({
  setFilterKeyword,
  setFilterVehicle,
  filterKeyword = '',
  filterVehicle = '',
}: FilterTypes) => {
  const [vehicles, setVehicles] = useState<ReservationVehicleTypes[] | []>([])

  const { supabase } = useSupabase()

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: {
      keyword: filterKeyword,
      vehicle: filterVehicle || 'all',
    },
  })

  useEffect(() => {
    form.reset({
      keyword: filterKeyword,
      vehicle: filterVehicle || 'all',
    })
  }, [filterKeyword, filterVehicle])

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    setFilterKeyword(data.keyword || '')
    setFilterVehicle(data.vehicle === 'all' ? '' : data.vehicle || '')
  }

  const handleClear = () => {
    form.reset({
      keyword: '',
      vehicle: 'all',
    })
    setFilterKeyword('')
    setFilterVehicle('')
  }

  const hasActiveFilters = filterKeyword || filterVehicle

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('ddm_reservation_vehicles')
        .select()
        .order('name', { ascending: true })
      setVehicles(data ?? [])
    })()
  }, [])

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Filters
          </span>
          {hasActiveFilters && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Active
            </span>
          )}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <FormField
                control={form.control}
                name="keyword"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 min-w-[220px]">
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Search
                    </FormLabel>
                    <Input
                      placeholder="Requester, department, or purpose"
                      className="h-9 w-full"
                      {...field}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5 min-w-[220px]">
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Vehicle
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All vehicles" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All vehicles</SelectItem>
                        {vehicles?.map((v, index) => (
                          <SelectItem key={index} value={String(v.id)}>
                            {v.plate_number
                              ? `${v.name} (${v.plate_number})`
                              : v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                Clear all
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default Filters
