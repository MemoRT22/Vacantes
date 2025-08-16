import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface StaffUser {
  id: string
  full_name: string
  email: string
  role: 'RH' | 'MANAGER'
  active: boolean
  created_at: string
  created_by?: string
}

export interface UserProfile {
  id: string
  full_name: string
  email: string
  role: 'RH' | 'MANAGER'
  active: boolean
}

export interface StaffUsersResponse {
  items: StaffUser[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Auth functions
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Staff user functions
export async function getUserProfile(): Promise<UserProfile> {
  const { data, error } = await supabase.rpc('get_user_profile')
  
  if (error) throw error
  return data
}

export async function listStaffUsers(params: {
  page?: number
  page_size?: number
  role?: 'RH' | 'MANAGER'
  active?: boolean
} = {}): Promise<StaffUsersResponse> {
  const { data, error } = await supabase.rpc('list_staff_users', {
    p_page: params.page || 1,
    p_page_size: params.page_size || 20,
    p_role: params.role || null,
    p_active: params.active ?? null
  })
  
  if (error) throw error
  return data
}

export async function createStaffUser(userData: {
  full_name: string
  email: string
  role: 'RH' | 'MANAGER'
  active?: boolean
  password?: string
}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/auth-staff/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create user')
  }
  
  return response.json()
}

export async function updateStaffUser(id: string, userData: {
  full_name?: string
  email?: string
  role?: 'RH' | 'MANAGER'
  active?: boolean
}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/auth-staff/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user')
  }
  
  return response.json()
}

export async function deleteStaffUser(id: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/auth-staff/users/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete user')
  }
  
  return response.json()
}

// Vacancy types and interfaces
export interface Vacancy {
  id: string
  type: 'ADMINISTRATIVO' | 'OPERATIVO'
  position: string
  objetivos?: string
  funciones?: string
  escolaridad?: string
  experiencia_minima?: string
  conocimientos_tecnicos?: string
  habilidades?: string
  manager_id: string
  manager_name?: string
  is_active: boolean
  created_by: string
  created_at: string
  required_docs?: RequiredDoc[]
}

export interface RequiredDoc {
  doc: string
  phase: 'NECESARIO' | 'DESPUES'
}

export interface VacanciesResponse {
  items: Vacancy[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CreateVacancyData {
  type: 'ADMINISTRATIVO' | 'OPERATIVO'
  position: string
  objetivos?: string
  funciones?: string
  escolaridad?: string
  experiencia_minima?: string
  conocimientos_tecnicos?: string
  habilidades?: string
  manager_id: string
  is_active?: boolean
  required_docs?: RequiredDoc[]
}

export interface UpdateVacancyData {
  type?: 'ADMINISTRATIVO' | 'OPERATIVO'
  position?: string
  objetivos?: string
  funciones?: string
  escolaridad?: string
  experiencia_minima?: string
  conocimientos_tecnicos?: string
  habilidades?: string
  manager_id?: string
  is_active?: boolean
}

// Document types enum
export const DOC_TYPES = [
  'SOLICITUD_EMPLEO',
  'CV',
  'ACTA_NACIMIENTO',
  'TITULO_O_CERTIFICADO',
  'CEDULA',
  'LICENCIA_TIPO_C',
  'INE',
  'CURP',
  'RFC',
  'NSS',
  'COMPROBANTE_DOMICILIO',
  'CERTIFICADO_MEDICO',
  'CARTAS_RECOMENDACION'
] as const

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

// Vacancy functions
export async function listVacanciesAdmin(params: {
  page?: number
  page_size?: number
  type?: 'ADMINISTRATIVO' | 'OPERATIVO'
  is_active?: boolean
} = {}): Promise<VacanciesResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.page_size) searchParams.set('page_size', params.page_size.toString())
  if (params.type) searchParams.set('type', params.type)
  if (params.is_active !== undefined) searchParams.set('is_active', params.is_active.toString())

  const response = await fetch(`${supabaseUrl}/functions/v1/vacancy-management/admin?${searchParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to list vacancies')
  }
  
  return response.json()
}

export async function listMyVacancies(params: {
  page?: number
  page_size?: number
  type?: 'ADMINISTRATIVO' | 'OPERATIVO'
  is_active?: boolean
} = {}): Promise<VacanciesResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.page_size) searchParams.set('page_size', params.page_size.toString())
  if (params.type) searchParams.set('type', params.type)
  if (params.is_active !== undefined) searchParams.set('is_active', params.is_active.toString())

  const response = await fetch(`${supabaseUrl}/functions/v1/vacancy-management/my?${searchParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to list my vacancies')
  }
  
  return response.json()
}

export async function getVacancy(id: string): Promise<Vacancy> {
  const response = await fetch(`${supabaseUrl}/functions/v1/vacancy-management/vacancy/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get vacancy')
  }
  
  return response.json()
}

export async function createVacancy(vacancyData: CreateVacancyData) {
  const response = await fetch(`${supabaseUrl}/functions/v1/vacancy-management/vacancies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(vacancyData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create vacancy')
  }
  
  return response.json()
}

export async function updateVacancy(id: string, vacancyData: UpdateVacancyData) {
  const response = await fetch(`${supabaseUrl}/functions/v1/vacancy-management/vacancy/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(vacancyData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update vacancy')
  }
  
  return response.json()
}

export async function setVacancyRequiredDocs(vacancyId: string, items: RequiredDoc[]) {
  const response = await fetch(`${supabaseUrl}/functions/v1/vacancy-management/${vacancyId}/docs`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to set required documents')
  }
  
  return response.json()
}

export async function getActiveManagers(): Promise<StaffUser[]> {
  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .eq('role', 'MANAGER')
    .eq('active', true)
    .order('full_name')
  
  if (error) throw error
  return data || []
}

// RH Interview types and interfaces
export interface QuestionBank {
  id: string
  name: string
  kind: string
  is_active: boolean
  created_at: string
  question_bank_versions: QuestionBankVersion[]
}

export interface QuestionBankVersion {
  id: string
  version: number
  is_active: boolean
  created_at: string
  questions: Question[]
}

export interface Question {
  id: string
  ord: number
  text: string
  is_required: boolean
}

export interface RHInterview {
  application_id: string
  bank_version_id: string
  started_at: string
  finished_at?: string
  answers: InterviewAnswer[]
  extra_questions: ExtraQuestion[]
  question_bank_versions: QuestionBankVersion & {
    question_banks: {
      name: string
      kind: string
    }
  }
}

export interface InterviewAnswer {
  question_id: string
  answer_text: string
}

export interface ExtraQuestion {
  text: string
  answer_text: string
}

export interface Application {
  id: string
  folio: string
  candidate_id: string
  vacancy_id: string
  status: string
  scheduled_rh_at?: string
  scheduled_rh_location?: string
  scheduled_manager_at?: string
  scheduled_manager_location?: string
  created_at: string
  candidate?: {
    full_name: string
    email: string
    phone: string
  }
  vacancy?: {
    position: string
    type: string
    manager_name?: string
  }
}

export interface ApplicationsResponse {
  items: Application[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// RH Interview functions
export async function importQuestionBankCSV(
  kind: string,
  csvFile: File,
  version?: number,
  activate: boolean = true
) {
  const formData = new FormData()
  formData.append('kind', kind)
  formData.append('csv_file', csvFile)
  if (version) formData.append('version', version.toString())
  formData.append('activate', activate.toString())

  const response = await fetch(`${supabaseUrl}/functions/v1/rh-interviews/import-csv`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to import question bank')
  }
  
  return response.json()
}

export async function getQuestionBanks(): Promise<QuestionBank[]> {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-interviews/banks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get question banks')
  }
  
  return response.json()
}

export async function scheduleRHInterview(
  applicationId: string,
  at: string,
  location: string
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-interviews/schedule`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId,
      at,
      location
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to schedule RH interview')
  }
  
  return response.json()
}

export async function startRHInterview(applicationId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-interviews/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start RH interview')
  }
  
  return response.json()
}

export async function saveRHInterviewDraft(
  applicationId: string,
  answers: InterviewAnswer[],
  extraQuestions: ExtraQuestion[] = []
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-interviews/draft`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId,
      answers,
      extra_questions: extraQuestions
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save interview draft')
  }
  
  return response.json()
}

export async function finalizeRHInterview(applicationId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-interviews/finalize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to finalize RH interview')
  }
  
  return response.json()
}

export async function getRHInterview(applicationId: string): Promise<RHInterview> {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-interviews/interview/${applicationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get RH interview')
  }
  
  return response.json()
}

// Application management functions
export async function listApplicationsForRH(params: {
  page?: number
  page_size?: number
  status?: string
  vacancy_id?: string
} = {}): Promise<ApplicationsResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.page_size) searchParams.set('page_size', params.page_size.toString())
  if (params.status) searchParams.set('status', params.status)
  if (params.vacancy_id) searchParams.set('vacancy_id', params.vacancy_id)

  const { data, error } = await supabase.rpc('list_applications_for_rh', {
    p_page: params.page || 1,
    p_page_size: params.page_size || 20,
    p_status: params.status || null,
    p_vacancy_id: params.vacancy_id || null
  })
  
  if (error) throw error
  return data
}

export async function getApplicationDetails(applicationId: string): Promise<Application> {
  const { data, error } = await supabase.rpc('get_application_details', {
    p_application_id: applicationId
  })
  
  if (error) throw error
  return data
}

// Manager Interview types and interfaces
export interface ManagerInterviewContext {
  application: {
    id: string
    folio: string
    status: string
    candidate: {
      full_name: string
      email: string
      phone: string
    }
    vacancy: {
      id: string
      position: string
      type: string
    }
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
  }
  interview_rh?: {
    bank_version_id: string
    started_at: string
    finished_at?: string
    questions: Question[]
    answers: InterviewAnswer[]
    extra_questions: ExtraQuestion[]
  }
  interview_manager: {
    score?: number
    notes?: string
    created_at?: string
    exists: boolean
  }
}

export interface ManagerApplication {
  id: string
  folio: string
  status: string
  candidate: {
    full_name: string
    email: string
    phone: string
  }
  vacancy: {
    id: string
    position: string
    type: string
  }
  scheduled_rh_at?: string
  scheduled_rh_location?: string
  scheduled_manager_at?: string
  scheduled_manager_location?: string
  created_at: string
  has_rh_interview: boolean
  rh_interview_finished: boolean
  has_manager_interview: boolean
}

export interface ManagerApplicationsResponse {
  items: ManagerApplication[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Manager Interview functions
export async function getManagerInterviewContext(applicationId: string): Promise<ManagerInterviewContext> {
  const { data, error } = await supabase.rpc('get_manager_interview_context', {
    p_application_id: applicationId
  })
  
  if (error) throw error
  return data
}

export async function setManagerSchedule(
  applicationId: string,
  at: string,
  location: string
) {
  const { data, error } = await supabase.rpc('set_manager_schedule', {
    p_application_id: applicationId,
    p_at: at,
    p_location: location
  })
  
  if (error) throw error
  return data
}

export async function saveManagerResult(
  applicationId: string,
  score: number,
  notes?: string
) {
  const { data, error } = await supabase.rpc('save_manager_result', {
    p_application_id: applicationId,
    p_score: score,
    p_notes: notes || ''
  })
  
  if (error) throw error
  return data
}

export async function listManagerApplications(params: {
  page?: number
  page_size?: number
  status?: string
} = {}): Promise<ManagerApplicationsResponse> {
  const { data, error } = await supabase.rpc('list_manager_applications', {
    p_page: params.page || 1,
    p_page_size: params.page_size || 20,
    p_status: params.status || null
  })
  
  if (error) throw error
  return data
}

// Evaluation types and interfaces
export interface EvaluationCriterion {
  id: number
  name: string
  grp: 'FORMACION_Y_EXPERIENCIA' | 'AREA_SOCIAL'
  ord: number
}

export interface EvaluationScore {
  criterion_id: number
  score: 1 | 2 | 3 | 4 | 5
}

export interface EvaluationSummary {
  total: number
  factors_for: string
  factors_against: string
  conclusion: string
  references_laborales: string
  created_at?: string
  exists: boolean
}

export interface EvaluationContext {
  application: {
    id: string
    folio: string
    status: string
    candidate: {
      full_name: string
      email: string
      phone: string
    }
    vacancy: {
      id: string
      position: string
      type: string
    }
    created_at: string
  }
  interview_rh: {
    bank_version_id: string
    started_at: string
    finished_at: string
    answers: InterviewAnswer[]
    extra_questions: ExtraQuestion[]
  }
  interview_manager: {
    score: number
    notes: string
    created_at: string
    exists: boolean
  }
  evaluation: EvaluationSummary
  criteria: EvaluationCriterion[]
  scores: EvaluationScore[]
  can_start: boolean
}

// Evaluation functions
export async function getEvaluationContext(applicationId: string): Promise<EvaluationContext> {
  const response = await fetch(`${supabaseUrl}/functions/v1/evaluation-management/context?application_id=${applicationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get evaluation context')
  }
  
  return response.json()
}

export async function startEvaluation(applicationId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/evaluation-management/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start evaluation')
  }
  
  return response.json()
}

export async function saveEvaluationScores(applicationId: string, scores: EvaluationScore[]) {
  const response = await fetch(`${supabaseUrl}/functions/v1/evaluation-management/scores`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId,
      scores
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save evaluation scores')
  }
  
  return response.json()
}

export async function saveEvaluationSummary(
  applicationId: string,
  factorsFor: string,
  factorsAgainst: string,
  conclusion: string,
  referencesLaborales: string = ''
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/evaluation-management/summary`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId,
      factors_for: factorsFor,
      factors_against: factorsAgainst,
      conclusion,
      references_laborales: referencesLaborales
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save evaluation summary')
  }
  
  return response.json()
}

export async function finalizeEvaluationAccept(applicationId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/evaluation-management/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to accept candidate')
  }
  
  return response.json()
}

export async function finalizeEvaluationReject(applicationId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/evaluation-management/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: applicationId
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to reject candidate')
  }
  
  return response.json()
}

// State Transition Functions
export async function transitionToRHInterview(
  applicationId: string,
  scheduledAt: string,
  location: string
) {
  const { data, error } = await supabase.rpc('transition_to_rh_interview', {
    p_application_id: applicationId,
    p_scheduled_at: scheduledAt,
    p_location: location
  })
  
  if (error) throw error
  return data
}

export async function transitionToManagerInterview(
  applicationId: string,
  scheduledAt: string,
  location: string
) {
  const { data, error } = await supabase.rpc('transition_to_manager_interview', {
    p_application_id: applicationId,
    p_scheduled_at: scheduledAt,
    p_location: location
  })
  
  if (error) throw error
  return data
}

export async function transitionToEvaluating(applicationId: string) {
  const { data, error } = await supabase.rpc('transition_to_evaluating', {
    p_application_id: applicationId
  })
  
  if (error) throw error
  return data
}

export async function finalizeAccept(applicationId: string) {
  const { data, error } = await supabase.rpc('finalize_accept', {
    p_application_id: applicationId
  })
  
  if (error) throw error
  return data
}

export async function finalizeReject(applicationId: string, reason?: string) {
  const { data, error } = await supabase.rpc('finalize_reject', {
    p_application_id: applicationId,
    p_reason: reason
  })
  
  if (error) throw error
  return data
}

// Dashboard types and interfaces
export interface DashboardSummary {
  active_vacancies: number
  applications_total: number
  applications_by_status: Record<string, number>
  avg_time_by_stage_hours: Record<string, number>
  accept_reject_rate_by_vacancy: Array<{
    vacancy_id: string
    position: string
    accepted: number
    rejected: number
    total: number
  }>
}

export interface AdminApplication {
  application_id: string
  folio: string
  status: string
  candidate_full_name: string
  candidate_email: string
  candidate_phone: string
  vacancy_id: string
  vacancy_position: string
  vacancy_type: string
  manager_full_name: string
  applied_at: string
}

export interface AdminApplicationsResponse {
  items: AdminApplication[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CSVExportResponse {
  export_id: string
  filename: string
  url: string
}

// Dashboard functions
export async function getDashboardSummary(params: {
  from?: string
  to?: string
} = {}): Promise<DashboardSummary> {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)

  const response = await fetch(`${supabaseUrl}/functions/v1/rh-dashboard/summary?${searchParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get dashboard summary')
  }
  
  return response.json()
}

export async function listApplicationsAdmin(params: {
  page?: number
  page_size?: number
  vacancy_id?: string
  status?: string
  q?: string
  from?: string
  to?: string
} = {}): Promise<AdminApplicationsResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.page_size) searchParams.set('page_size', params.page_size.toString())
  if (params.vacancy_id) searchParams.set('vacancy_id', params.vacancy_id)
  if (params.status) searchParams.set('status', params.status)
  if (params.q) searchParams.set('q', params.q)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)

  const response = await fetch(`${supabaseUrl}/functions/v1/rh-dashboard/applications?${searchParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to list applications')
  }
  
  return response.json()
}

export async function exportApplicationsCSV(params: {
  vacancy_id: string
  status?: string
  from?: string
  to?: string
}): Promise<CSVExportResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-dashboard/export-csv`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to export CSV')
  }
  
  return response.json()
}

export async function refreshDashboardViews(): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/rh-dashboard/refresh-views`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to refresh dashboard views')
  }
}