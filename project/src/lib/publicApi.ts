import { createClient } from '@supabase/supabase-js'

// Public API functions for the candidate-facing site
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface PublicVacancy {
  id: string
  position: string
  type: 'ADMINISTRATIVO' | 'OPERATIVO'
  is_active: boolean
}

export interface PublicVacancyDetail {
  id: string
  position: string
  type: 'ADMINISTRATIVO' | 'OPERATIVO'
  is_active: boolean
  created_at: string
  objetivos?: string
  funciones?: string
  escolaridad?: string
  experiencia_minima?: string
  conocimientos_tecnicos?: string
  habilidades?: string
  required_docs?: RequiredDoc[]
}

export interface RequiredDoc {
  doc: string
  phase: 'NECESARIO' | 'DESPUES'
}

export interface VacanciesResponse {
  items: PublicVacancy[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApplyRequest {
  vacancy_id: string
  candidate: {
    full_name: string
    email: string
    phone: string
  }
  files: {
    doc: string
    file: File
  }[]
}

export interface ApplyResponse {
  folio: string
  status: string
}

export interface ApplicationStatus {
  folio: string
  vacancy: {
    id: string
    position: string
    type: 'ADMINISTRATIVO' | 'OPERATIVO'
  }
  status: string
  timeline: Array<{
    step: string
    reached: boolean
    current?: boolean
    value?: string | null
  }>
  schedules: {
    rh?: {
      at: string
      location: string
    }
    manager?: {
      at: string
      location: string
    }
  }
  docs: {
    necesarios: {
      required: string[]
      uploaded: string[]
      pending: string[]
    }
    despues: {
      required: string[]
      uploaded: string[]
      pending: string[]
      can_upload: boolean
    }
  }
}

export interface StatusQueryRequest {
  folio: string
  email: string
}

// Document type labels
export const DOC_TYPE_LABELS: Record<string, string> = {
  'SOLICITUD_EMPLEO': 'Solicitud de Empleo',
  'CV': 'Currículum Vitae',
  'ACTA_NACIMIENTO': 'Acta de Nacimiento',
  'TITULO_O_CERTIFICADO': 'Título o Certificado',
  'CEDULA': 'Cédula Profesional',
  'LICENCIA_TIPO_C': 'Licencia Tipo C',
  'INE': 'INE',
  'CURP': 'CURP',
  'RFC': 'RFC',
  'NSS': 'NSS',
  'COMPROBANTE_DOMICILIO': 'Comprobante de Domicilio',
  'CERTIFICADO_MEDICO': 'Certificado Médico',
  'CARTAS_RECOMENDACION': 'Cartas de Recomendación'
}

// API Functions
export async function listPublicVacancies(params: {
  page?: number
  page_size?: number
  type?: 'ADMINISTRATIVO' | 'OPERATIVO'
  q?: string
} = {}): Promise<VacanciesResponse> {
  const page = params.page || 1
  const pageSize = params.page_size || 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('vacancies_public')
    .select('id, position, type, is_active, created_at', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // Apply filters
  if (params.type) {
    query = query.eq('type', params.type)
  }

  if (params.q) {
    query = query.ilike('position', `%${params.q}%`)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(error.message)
  }

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    items: data || [],
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages
  }
}

export async function getPublicVacancy(id: string): Promise<PublicVacancyDetail> {
  // Get vacancy details
  const { data: vacancy, error: vacancyError } = await supabase
    .from('vacancies_public')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  
  if (vacancyError) {
    throw new Error(vacancyError.message)
  }
  
  // Get required documents
  const { data: requiredDocs, error: docsError } = await supabase
    .from('vacancy_required_docs')
    .select('doc, phase')
    .eq('vacancy_id', id)
  
  if (docsError) {
    throw new Error(docsError.message)
  }

  return {
    ...vacancy,
    required_docs: requiredDocs || []
  }
}

export async function applyToVacancy(request: ApplyRequest): Promise<ApplyResponse> {
  const formData = new FormData()
  
  // Add candidate data
  formData.append('vacancy_id', request.vacancy_id)
  formData.append('candidate', JSON.stringify(request.candidate))
  
  // Add files
  request.files.forEach((fileData, index) => {
    formData.append(`files[${index}][doc]`, fileData.doc)
    formData.append(`files[${index}][file]`, fileData.file)
  })

  const response = await fetch(`${supabaseUrl}/functions/v1/public-applications`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to submit application')
  }
  
  return response.json()
}

export async function getApplicationStatus(request: StatusQueryRequest): Promise<ApplicationStatus> {
  const response = await fetch(`${supabaseUrl}/functions/v1/application-status`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get application status')
  }
  
  return response.json()
}

// After Documents Upload API
export interface AfterDocsProgress {
  required: string[]
  uploaded: Array<{
    doc: string
    version: number
    uploaded_at: string
    url: string
  }>
  pending: string[]
  can_upload: boolean
  status: string
}

export interface StartUploadResponse {
  upload_id: string
  upload_url: string
  max_version_expected: number
}

export interface FinalizeUploadResponse {
  ok: boolean
  doc: string
  version: number
  uploaded_at: string
}

export async function getAfterDocsProgress(folio: string, email: string): Promise<AfterDocsProgress> {
  const response = await fetch(`${supabaseUrl}/functions/v1/after-docs-upload/progress`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ folio, email })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get after docs progress')
  }
  
  return response.json()
}

export async function startAfterDocUpload(
  folio: string,
  email: string,
  doc: string,
  file: File
): Promise<StartUploadResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/after-docs-upload/start-upload`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      folio,
      email,
      doc,
      filename: file.name,
      mimetype: file.type,
      size: file.size
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start upload')
  }
  
  return response.json()
}

export async function uploadFileToStorage(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to upload file to storage')
  }
}

export async function finalizeAfterDocUpload(uploadId: string): Promise<FinalizeUploadResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/after-docs-upload/finalize-upload`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ upload_id: uploadId })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to finalize upload')
  }
  
  return response.json()
}