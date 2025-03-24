export const docTypes = [
  'Solicitation / Financial Assistance',
  'Medical Assistance',
  'Courtesy Call',
  'Invitation',
  'Infrastructure Request',
  'Request Endorsement/Applicants',
  'Others',
]

export const departments = [
  { office: 'Tourism', default: 'Received at Tourism' },
  { office: 'Mayor', default: 'Received at Mayors Office' },
  { office: 'MPDO', default: 'Received at MPDO' },
  { office: 'GSO', default: 'Received at GSO' },
  { office: 'BAC', default: 'Received at BAC' },
  { office: 'MTO', default: 'Received at Treasurers' },
  { office: 'MYDO', default: 'Received at MYDO' },
]

export const docRouting = [
  { office: 'Mayor', status: 'Received at Admin' },
  { office: 'Mayor', status: 'Received at Mayors Office' },
  { office: 'Tourism', status: 'Received at Tourism' },
  { office: 'MPDO', status: 'Received at MPDO' },
  { office: 'GSO', status: 'Received at GSO' },
  { office: 'BAC', status: 'Received at BAC' },
  { office: 'MTO', status: 'Received at Treasurers' },
  { office: 'MYDO', status: 'Received at MYDO' },
  { office: 'Mayor', status: 'Forwarded to Accounting' },
  { office: 'Mayor', status: 'Forwarded to Admin' },
  { office: 'Mayor', status: 'Forwarded to Agriculture' },
  { office: 'Mayor', status: 'Forwarded to Assesors' },
  {
    office: 'Mayor',
    status: 'Forwarded to Atty. Kate Daytec Aventajado',
  },
  { office: 'BAC', status: 'Forwarded to BAC' },
  { office: 'Mayor', status: 'Forwarded to BFP' },
  { office: 'Mayor', status: 'Forwarded to BJMP' },
  { office: 'Mayor', status: 'Forwarded to Budget' },
  { office: 'Mayor', status: 'Forwarded to COA' },
  { office: 'Mayor', status: 'Forwarded to DCO' },
  { office: 'Mayor', status: 'Forwarded to DILG' },
  { office: 'Mayor', status: 'Forwarded to Engineering' },
  { office: 'GSO', status: 'Forwarded to GSO' },
  {
    office: 'Mayor',
    status: 'Forwarded to GSO DESIGNEE - Raphael Claude Rousseau',
  },
  { office: 'Mayor', status: 'Forwarded to HR' },
  { office: 'Mayor', status: 'Forwarded to LCR' },
  { office: 'Mayor', status: 'Forwarded to Mayors Office' },
  { office: 'Mayor', status: 'Forwarded to MEDO' },
  { office: 'Mayor', status: 'Forwarded to MDRRMO' },
  { office: 'MPDO', status: 'Forwarded to MPDO' },
  { office: 'Mayor', status: 'Forwarded to MSWDO' },
  { office: 'MYDO', status: 'Forwarded to MYDO' },
  { office: 'Mayor', status: 'Forwarded to Permit Div' },
  { office: 'Mayor', status: 'Forwarded to PDAO' },
  { office: 'Mayor', status: 'Forwarded to PNP' },
  { office: 'Mayor', status: 'Forwarded to RHU' },
  { office: 'Mayor', status: 'Forwarded to Sentro sa Pagserbis YU' },
  { office: 'Mayor', status: 'Forwarded to SB Office' },
  { office: 'Mayor', status: 'Forwarded to Subanen Affairs' },
  { office: 'Tourism', status: 'Forwarded to Tourism' },
  { office: 'MTO', status: 'Forwarded to Treasurers' },
]

export const documentTypes = [
  { type: 'Business Permit', shortcut: 'BUSS-PER' },
  { type: 'Case', shortcut: 'CASE' },
  { type: 'Certification', shortcut: 'CERT' },
  { type: 'Contract of Service', shortcut: 'COS' },
  { type: 'Cheque', shortcut: 'CHQ' },
  { type: 'DTR', shortcut: 'DTR' },
  { type: 'Disbursement Voucher', shortcut: 'DV' },
  { type: 'Executive Order', shortcut: 'EO' },
  { type: 'IPCR/OPCR', shortcut: 'IPCR/OPCR' },
  { type: 'Letters', shortcut: 'LETTER' },
  { type: 'Leave', shortcut: 'LEAVE' },
  { type: 'Liquidation', shortcut: 'LIQUIDATION' },
  { type: 'Retirement', shortcut: 'RET' },
  { type: 'Memorandum Order', shortcut: 'MEMO' },
  { type: 'Notice', shortcut: 'NOTICE' },
  { type: 'Notice of Violation', shortcut: 'NOTI-VIOL' },
  { type: 'Office Order', shortcut: 'OFC-ORD' },
  { type: 'Other Documents', shortcut: 'OTR-DOC' },
  { type: 'Order of Payment', shortcut: 'ORD-PYMT' },
  { type: 'Ordinance', shortcut: 'ORD' },
  { type: 'OBR', shortcut: 'OBR' },
  { type: 'OBR/Payroll', shortcut: 'OBR/PYRL' },
  { type: 'Permit', shortcut: 'PERMIT' },
  { type: 'Project', shortcut: 'PROJ' },
  { type: 'PR/OBR', shortcut: 'PR/OBR' },
  { type: 'Purchase Request', shortcut: 'PR' },
  { type: 'Proposal', shortcut: 'PRPSL' },
  { type: 'Purchase Order', shortcut: 'PO' },
  { type: 'OBR/Reimbursement', shortcut: 'OBR/REIMB' },
  { type: 'Resolution', shortcut: 'RESO' },
  { type: 'Reports', shortcut: 'REPORT' },
  { type: 'Salary Loan', shortcut: 'SAL-LOAN' },
  { type: 'Show Cause', shortcut: 'SHW-CAUSE' },
  { type: 'Special Order', shortcut: 'SO' },
  { type: 'Travel Order', shortcut: 'TO' },
]

export const statusList = [
  { status: 'Approved', color: '#287f00' },
  { status: 'Canceled', color: '#e02626' },
  { status: 'Disapproved', color: '#e02626' },
  { status: 'For File', color: '#997c00' },
  { status: 'For Further Instruction', color: '#997c00' },
  { status: 'Open', color: '#2154db' },
  { status: 'Resolved', color: '#a44508' },
]

export const superAdmins = ['berlcamp@gmail.com', 'arfel@ddm.com']

export const risOffices = [
  'DILG',
  'MEO',
  'GREENVILLE',
  'MAO',
  'ACCOUNTING',
  'MSOA',
  'BJMP',
  'MPDO',
  'MMO',
  'MSWD',
  'TOURISM',
  'PNP',
  'DWD',
  'KALIPI',
  'ASSESOR',
  'GSO',
  'MDRRMO',
  'MENRO',
  'SR CITIZEN',
  'BPLO',
  'PDAO',
  'MTO',
  'MCR',
  'DOCO',
  'MHO',
  'LEGAL',
  'PESO',
  'MYDO',
  'OTP',
  'MEDO',
]

export const profileCategories = ['', 'A', 'B', 'C', 'D', 'E', 'UC', 'INC']

export const profilePositions = [
  'Barangay Chairman',
  'Barangay Councilor',
  'Barangay Secretary',
  'Barangay Treasurer',
  'BHW',
  'BPAT',
  'Government Employee',
  'LGU Employee',
  'Cluster Household Leader',
  'Household Leader',
  'Undefined',
]

export const barangays = [
  'BAG-ONG VALENCIA',
  'BAGONG KAUSWAGAN',
  'BAGONG SILANG',
  'BUCAYAN',
  'CALUMANGGI',
  'CANIBONGAN',
  'CARIDAD',
  'DANLUGAN',
  'DAPIWAK',
  'DATU TOTOCAN',
  'DILUD',
  'DITULAN',
  'DULIAN',
  'DULOP',
  'GUINTANANAN',
  'GUITRAN',
  'GUMPINGAN',
  'LA FORTUNA',
  'LABANGON',
  'LIBERTAD',
  'LICABANG',
  'LIPAWAN',
  'LOWER LANDING',
  'LOWER TIMONAN',
  'MACASING',
  'MAHAYAHAY',
  'MALAGALAD',
  'MANLABAY',
  'MARALAG',
  'MARANGAN',
  'NEW BASAK',
  'SAAD',
  'SALVADOR',
  'SAN JUAN',
  'SAN PABLO',
  'SAN PEDRO',
  'SAN VICENTE',
  'SENOTE',
  'SINONOK',
  'SUNOP',
  'TAGUN',
  'TAMURAYAN',
  'UPPER LANDING',
  'UPPER TIMONAN',
]

export const services = ['TUPAD Beneficiary', 'DSWD Food For Work']
