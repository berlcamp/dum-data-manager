/* eslint-disable react-hooks/exhaustive-deps */
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import type { ProfileBlcTypes } from '@/types/index'
import { XMarkIcon } from '@heroicons/react/24/solid'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

interface ChooseUsersProps {
  profileId: string
  coordinator: ProfileBlcTypes | null
}

export default function Coordinator({
  coordinator,
  profileId,
}: ChooseUsersProps) {
  const [searchManager, setSearchManager] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileBlcTypes[] | []>([])
  const [coordinators, setCoordinators] = useState<ProfileBlcTypes[] | []>([])
  const [selectedCoordinator, setSelectedCoordinator] =
    useState<ProfileBlcTypes | null>(coordinator)

  const { supabase } = useSupabase()
  const { setToast } = useFilter()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const handleSearchUser = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchManager('')

    setSearchManager(e.target.value)

    if (e.target.value.trim().length < 3) {
      setSearchResults([])
      return
    }

    // Search user
    const searchWords = e.target.value.split(' ')
    const results = coordinators.filter((user) => {
      // exclude already selected users
      if (selectedCoordinator?.id === user.id.toString()) return false

      const fullName = `${user.fullname}`.toLowerCase()
      return searchWords.every((word) => fullName.includes(word))
    })

    setSearchResults(results)
  }

  const handleSelected = async (item: ProfileBlcTypes) => {
    setSelectedCoordinator(item)

    try {
      const { error } = await supabase
        .from('ddm_profiles')
        .update({ coordinator_id: item.id })
        .eq('id', profileId)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        coordinator_id: item.id,
        coordinator: item,
        id: profileId,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      setToast('success', 'Successfully save!')
    } catch (e) {
      setToast('error', 'Something went wrong')
    }

    // Resets
    setSearchResults([])

    setSearchManager('')
  }

  const handleRemoveSelected = async () => {
    try {
      const { error } = await supabase
        .from('ddm_profiles')
        .update({ coordinator_id: null })
        .eq('id', profileId)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        coordinator_id: null,
        coordinator: null,
        id: profileId,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      setToast('success', 'Successfully save!')
    } catch (e) {
      setToast('error', 'Something went wrong')
    }

    setSelectedCoordinator(null)
  }

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('ddm_profile_coordinators').select()
      setCoordinators(data)
    })()
  }, [])

  return (
    <div className="">
      <div className="w-full">
        <div className="bg-white p-1 border border-gray-300 rounded-sm">
          {selectedCoordinator && (
            <div className="space-x-2">
              <div className="mb-1 inline-flex">
                <span className="inline-flex items-center text-sm  border border-gray-400 rounded-sm px-1 bg-gray-300">
                  {selectedCoordinator.fullname}
                  <XMarkIcon
                    onClick={handleRemoveSelected}
                    className="w-4 h-4 ml-2 cursor-pointer"
                  />
                </span>
              </div>
            </div>
          )}
          {!selectedCoordinator && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search Coordinator"
                value={searchManager}
                onChange={async (e) => await handleSearchUser(e)}
                className="app__input_noborder"
              />

              {searchResults.length > 0 && (
                <div className="app__search_user_results_container">
                  {searchResults.map((item: ProfileBlcTypes, index) => (
                    <div
                      key={index}
                      onClick={async () => await handleSelected(item)}
                      className="app__search_user_results">
                      <div className="flex items-center space-x-1">
                        <div className="font-medium text-xs capitalize">
                          {item.fullname}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
