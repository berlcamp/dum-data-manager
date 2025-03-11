/* eslint-disable @next/next/no-img-element */
'use client'
import { CustomButton } from '@/components/index'
import { Button } from '@/components/ui/button'
import { barangays } from '@/constants/TrackerConstants'
import { useSupabase } from '@/context/SupabaseProvider'
import { ProfileTypes } from '@/types'
import imageCompression from 'browser-image-compression'
import html2canvas from 'html2canvas'
import Image from 'next/image'
import { useRef, useState } from 'react'

interface ModalProps {
  hideModal: () => void
  details: ProfileTypes
}

export default function PrintModal({ hideModal, details }: ModalProps) {
  // useStates
  const [photoIdPreview, setPhotoIdPreview] = useState<string | null>(
    details.photo_id_url
      ? `https://nuhirhfevxoonendpfsm.supabase.co/storage/v1/object/public/ddm_public/${details.photo_id_url}`
      : null
  )
  const [gender, setGender] = useState(details.gender ?? '')
  const [birthday, setBirthday] = useState(details.birthday ?? '')
  const [fullname, setFullname] = useState(details.fullname)
  const [address, setAddress] = useState(`${details.address}, DUMINGAG, ZDS`)
  const [selectedFile, setSelectedFile] = useState<File | null | undefined>(
    null
  )

  const divRef = useRef(null)

  const { supabase } = useSupabase()

  const handlePhotoIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setPhotoIdPreview(imageUrl)
      setSelectedFile(file)
    }
  }
  const downloadImage = async () => {
    if (!divRef.current) return

    let photoUrl = ''
    if (selectedFile instanceof File) {
      photoUrl = (await uploadPhoto(selectedFile, 'photo_id')) || ''
    }

    const { error } = await supabase
      .from('ddm_profiles')
      .update({
        birthday: birthday ?? null,
        gender: gender,
        photo_id_url: photoUrl,
      })
      .eq('id', details.id)

    if (error) {
      console.error('error', error.message)
    }

    const canvas = await html2canvas(divRef.current, { useCORS: true })
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0) // Convert to JPG

    // Create a link and download
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'downloaded-image.jpg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function uploadPhoto(file: File, folder: string) {
    const newFileName = `oc.${file.name.split('.').pop()}`

    // Image compression options
    const options = {
      maxSizeMB: 1, // Max file size in MB
      maxWidthOrHeight: 600, // Resize to fit within 1024px
      useWebWorker: true,
    }

    try {
      const compressedFile = await imageCompression(file, options) // Compress the image

      const { data, error } = await supabase.storage
        .from('ddm_public') // Change to your bucket
        .upload(`${folder}/${details.id}/${newFileName}`, compressedFile, {
          upsert: true,
        })

      if (error) {
        console.error('Upload Error:', error)
        return null
      }

      return data.path // Return file path
    } catch (err) {
      console.error('Compression Error:', err)
      return null
    }
  }

  // Get the index of the barangay (adding 1 to start from 1, not 0)
  let barangayIndex = barangays.indexOf(details.address) + 1

  // Format barangay index with leading zero if less than 10
  let formattedBarangayIndex = barangayIndex.toString().padStart(2, '0')

  // Format ID with leading zeros to always have 5 digits
  let formattedId = details.id.toString().padStart(5, '0')

  // Generate the final ID number
  const idNo = `OC-${formattedBarangayIndex}-${formattedId}`

  return (
    <div className="app__modal_wrapper">
      <div className="app__modal_wrapper2_large">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              Print ID
            </h5>
            <div className="flex space-x-2">
              <CustomButton
                containerStyles="app__btn_gray"
                title="Close"
                btnType="button"
                handleClick={hideModal}
              />
            </div>
          </div>

          <div className="modal-body relative overflow-x-scroll p-4">
            <div className="grid md:grid-cols-3 md:gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-center text-xs">
                  Choose ID Photo
                </div>
                <div className="flex items-center justify-center relative">
                  <div className="relative overflow-hidden border border-gray-300">
                    <label
                      htmlFor="file-photo-id"
                      className="cursor-pointer">
                      {photoIdPreview ? (
                        <Image
                          src={photoIdPreview}
                          width={100}
                          height={100}
                          alt="profile preview"
                          className=""
                        />
                      ) : (
                        <Image
                          src="/avatar.png"
                          width={100}
                          height={100}
                          alt="default profile"
                          className=""
                        />
                      )}
                    </label>
                    <input
                      type="file"
                      className="hidden"
                      id="file-photo-id"
                      accept="image/*"
                      onChange={handlePhotoIdChange}
                    />
                  </div>
                </div>
                <div className="flex space-x-2 items-center justify-center text-xs">
                  <span>Birthday</span>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="app__input_standard"
                  />
                </div>
                <div className="flex space-x-2 items-center justify-center text-xs">
                  <span>Gender</span>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="app__input_standard">
                    <option>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              {/* Div to capture */}
              <div className="col-span-2 p-4 bg-white shadow-lg rounded-lg">
                <div
                  ref={divRef}
                  className="relative max-w-[400px] max-h-[400px]">
                  <img
                    src="/id_layout.jpg"
                    width={400}
                    height={400}
                    alt="ID Layout"
                  />
                  <span className="text-xs absolute top-[108px] left-36 text-white stroke-black drop-shadow-[1px_1px_0px_black] tracking-tighter">
                    {fullname}
                  </span>

                  <span className="text-xs absolute top-[146px] left-36 text-white stroke-black drop-shadow-[1px_1px_0px_black] tracking-tighter">
                    {address}
                  </span>
                  <span className="text-xs absolute top-[182px] left-36 text-white stroke-black drop-shadow-[1px_1px_0px_black] tracking-tighter">
                    {birthday}
                  </span>
                  <span className="text-xs absolute top-[182px] left-64 text-white stroke-black drop-shadow-[1px_1px_0px_black] tracking-tighter">
                    {gender}
                  </span>
                  <span className="text-xs absolute top-[182px] left-2 text-white stroke-black drop-shadow-[1px_1px_0px_black] tracking-tighter">
                    ID No. {idNo}
                  </span>
                  {photoIdPreview && (
                    <>
                      <Image
                        src={photoIdPreview}
                        width={92}
                        height={92}
                        alt="profile preview"
                        className="absolute top-[80px] left-[10px]"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center p-4">
              <Button
                onClick={downloadImage}
                type="submit"
                variant="green">
                Save and Download ID
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
