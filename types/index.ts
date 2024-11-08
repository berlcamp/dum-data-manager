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
  id: string
  firstname: string
  middlename: string
  lastname: string
  avatar_url: string
  department: string
  status: string
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

export interface DocumentRemarksTypes {
  id?: string
  user_id: string
  timestamp: string
  user: string
  remarks: string
  tracker_id: string
}
export interface DocumentFlowchartTypes {
  id: string
  date: string
  time: string
  user: string
  user_id: string
  title: string
  message: string
  tracker_id: string
  tracker_route_id: string
  change_logs: DocumentFlowchartTypes[]
}
export interface DocumentTypes {
  id: string
  type: string
  specify: string
  agency: string
  location: string
  requester: string
  activity_date: string
  contact_number: string
  status: string
  cheque_no: string
  particulars: string
  date_received: string
  user_id: string
  recent_remarks: DocumentRemarksTypes
  ddm_user: AccountTypes
  attachments: { name: string }[]
  amount: string
  received_from: string
  routing_no: number
  routing_slip_no: string
  received_by: string
  origin_department: string
}

export interface AccountTypes {
  id: string
  firstname: string
  middlename: string
  lastname: string
  status: string
  password: string
  department: string
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
  appropriation: string
  type: string
  quantity: number
  amount: number
  price: number
  diesel_price: number
  gasoline_price: number
  total_amount: number
  po_date: string
  description: string
  created_by: string
  ddm_user: AccountTypes
  ddm_ris: RisTypes[]
  remaining_quantity?: string
  ddm_ris_appropriation: RisAppropriationTypes
}

export interface RisCaTypes {
  id: string
  ca_number: string
  amount: number
  ca_date: string
  description: string
  created_by: string
  ddm_user: AccountTypes
  ddm_ris: RisTypes[]
  remaining_amount?: number
}

export interface RisTypes {
  id: number
  ris_number: string
  po_id: string
  ca_id: string
  requester: string
  date_requested: string
  department_id: string
  appropriation_id: string
  quantity: number
  price: number
  total_amount: number
  purpose: string
  status: string
  origin: string
  transaction_type: string
  type: string
  created_by: string
  vehicle_id: string
  ddm_user: AccountTypes
  vehicle: RisVehicleTypes
  purchase_order: RisPoTypes
  cash_advance: RisCaTypes
  department: RisDepartmentTypes
  destination: string
}

export interface RisVehicleTypes {
  id: string
  name: string
  plate_number: string
}

export interface RisDepartmentCodeTypes {
  id: string
  code: string
  department_id: string
  po_id: string
  department: RisDepartmentTypes
  purchase_order: RisPoTypes
  status: string
}

export interface RisPriceTypes {
  id: string
  diesel: number
  gasoline: number
  date: string
}

export interface RisDepartmentTypes {
  id: string
  name: string
  office: string
}

export interface ProfileSurveyTypes {
  id: string
  name: string
}

export interface ServicesTypes {
  id: string
  date: string
  amount: string
  profile_id: string
  profile: ProfileTypes
  service: ServicesListTypes
  count: number
}

export interface ServicesListTypes {
  id: string
  name: string
  services_availed: ServicesTypes[]
}

export interface SurveyCategoryTypes {
  id: string
  category: string
  type: string
  profile_id: string
  survey_id: string
}

export interface RisAppropriationTypes {
  id: string
  name: string
  amount: number
  ddm_ris_purchase_orders: RisPoTypes[]
  remaining_amount?: number
}
export interface ProfileBlcTypes {
  id: string
  fullname: string
  barangay: string
}

export interface ImportLogTypes {
  id: string
  created_at: string
  type: string
  profile: ProfileTypes
  survey: ProfileSurveyTypes
}

export interface ProfileCategoriesType {
  id: string
  profile_id: string
  category: string
  type: string
  remarks: string
  survey_id: string
}

export interface ProfileTypes {
  id: string
  fullname: string
  address: string
  coordinator_id: string
  coordinator: ProfileBlcTypes
  position: string
  precinct: string
  purok: string
  categories: ProfileCategoriesType[]
}
export interface ProfileRemarksTypes {
  id?: string
  user_id: string
  timestamp: string
  user: string
  remarks: string
  profile_id: string
  profile?: ProfileTypes
  type: string
}

export interface ChartDataSetTypes {
  label: string
  data: number[]
  bgColor: string
}

export interface ReservationTypes {
  id: string
  type: string
  date: string
  time: string
  status: string
  date_created: string
  requester: string
  department: string
  purpose: string
  vehicle_id: string
  vehicle: ReservationVehicleTypes
}

export interface ReservationVehicleTypes {
  id: string
  name: string
  plate_number: string
}

export interface HoursTypes {
  hour: string
  reservations: ReservationTypes[]
}

export interface ListTypes {
  date: string
  hours: HoursTypes[]
}
