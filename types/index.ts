import { type MouseEventHandler } from 'react'

export interface SelectUserNamesProps {
  settingsData: any[]
  multiple: boolean
  type: string
  handleManagerChange: (newdata: any[], type: string) => void
  title: string
}

export interface searchUser {
  firstname: string
  middlename: string
  lastname: string
  uuid?: string
  id: string
}

export interface namesType {
  firstname: string
  middlename: string
  lastname: string
  avatar_url: string
  id: string
}

export interface settingsDataTypes {
  access_type: string
  data: namesType
}

export interface CustomButtonTypes {
  isDisabled?: boolean
  btnType?: 'button' | 'submit'
  containerStyles?: string
  textStyles?: string
  title: string
  rightIcon?: any
  handleClick?: MouseEventHandler<HTMLButtonElement>
}

export interface NotificationTypes {
  id?: string
  message: string
  created_at?: string
  url: string
  type: string
  user_id: string
  dum_document_tracker_id: string
  reference_table?: string
  is_read?: boolean
}

export interface AccountDetailsForm {
  firstname: string
  middlename: string
  lastname: string
}

export interface StickiesTypes {
  id: string
  tracker_id: string
  user_id: string
  note: string
  color: string
  tracker: DocumentTypes
}

export interface DocumentTypes {
  id: string
  type: string
  specify: string
  requester: string
  activity_date: string
  status: string
  particulars: string
  date_received: string
  user_id: string
  ddm_user: AccountTypes
  tracker_stickies: StickiesTypes[]
  attachments: { name: string}[]
}

export interface AccountTypes {
  id: string
  firstname: string
  middlename: string
  lastname: string
  status: string
  password: string
  avatar_url: string
  email: string
  org_id: string
  created_by: string
  temp_password: string
}

export interface DocTypes {
  id: string
  type: string
  shortcut: string
  isChecked?: boolean
}

export interface AttachmentTypes {
  id: string
  name: string
}

export interface UserAccessTypes {
  user_id: string
  type: string
  ddm_user: namesType
}

export interface RisPoTypes {
  id: string
  po_number: string
  type: string
  quantity: number
  po_date: string
  description: string
  created_by: string
  ddm_user: AccountTypes
}

export interface RisTypes {
  id: number
  ris_number: string
  po_id: string
  requester: string
  date_requested: string
  department_id: string
  quantity: number
  purpose: string
  created_by: string
  vehicle_id: string
  ddm_user: AccountTypes
  vehicle: RisVehicleTypes
  purchase_order: RisPoTypes
  department: RisDepartmentTypes
}

export interface RisVehicleTypes {
  id: string
  name: string
  plate_number: string
}

export interface RisDepartmentTypes {
  id: string
  name: string
  office: string
}
