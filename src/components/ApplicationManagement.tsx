import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  listApplicationsForRH,
  getApplicationDetails,
  transitionToRHInterview,
  startRHInterview,
  saveRHInterviewDraft,
  finalizeRHInterview,
  getRHInterview,
  Application,
  ApplicationsResponse,
  RHInterview,
  InterviewAnswer,
  ExtraQuestion
} from '../lib/supabase'
import { 
  Search, 
  Filter,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Save,
  Send,
  Plus,
  Trash2
} from 'lucide-react'

export function ApplicationManagement() {
  const { profile } = useAuth()
  const [applications, setApplications] = useState<ApplicationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [currentInterview, setCurrentInterview] = useState<RHInterview | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)

  // Only allow RH users
  if (profile?.role !== 'RH') {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso denegado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Solo usuarios con rol RH pueden gestionar aplicaciones.
        </p>
      </div>
    )
  }

  const loadApplications = async () => {
    try {
      setLoading(true)
      const data = await listApplicationsForRH({
        page: currentPage,
        page_size: 20,
        status: filters.status || undefined
      })
      setApplications(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [currentPage, filters])

  const handleScheduleInterview = async (applicationId: string, at: string, location: string) => {
    try {
      await transitionToRHInterview(applicationId, at, location)
      setShowScheduleModal(false)
      setSelectedApplication(null)
      loadApplications()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStartInterview = async (application: Application) => {
    try {
      const interviewData = await startRHInterview(application.id)
      setCurrentInterview({
        application_id: application.id,
        bank_version_id: interviewData.bank_version_id,
        started_at: interviewData.started_at,
        answers: [],
        extra_questions: [],
        question_bank_versions: {
          id: interviewData.bank_version_id,
          version: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          questions: interviewData.questions,
          question_banks: {
            name: 'Auto-selected',
            kind: 'AUTO'
          }
        }
      })
      setSelectedApplication(application)
      setShowInterviewModal(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleViewInterview = async (application: Application) => {
    try {
      const interview = await getRHInterview(application.id)
      setCurrentInterview(interview)
      setSelectedApplication(application)
      setShowInterviewModal(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RevisionDeDocumentos':
        return 'bg-yellow-100 text-yellow-800'
      case 'EntrevistaConRH':
        return 'bg-blue-100 text-blue-800'
      case 'EntrevistaConManager':
        return 'bg-purple-100 text-purple-800'
      case 'Evaluando':
        return 'bg-orange-100 text-orange-800'
      case 'Aceptado':
        return 'bg-green-100 text-green-800'
      case 'Rechazado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'RevisionDeDocumentos':
        return 'Revisión de Documentos'
      case 'EntrevistaConRH':
        return 'Entrevista con RH'
      case 'EntrevistaConManager':
        return 'Entrevista con Manager'
      case 'Evaluando':
        return 'Evaluando'
      case 'Aceptado':
        return 'Aceptado'
      case 'Rechazado':
        return 'Rechazado'
      default:
        return status
    }
  }

  const filteredApplications = applications?.items.filter(app => 
    app.candidate?.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    app.folio.toLowerCase().includes(filters.search.toLowerCase()) ||
    app.vacancy?.position.toLowerCase().includes(filters.search.toLowerCase())
  ) || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Aplicaciones</h1>
          <p className="mt-2 text-sm text-gray-700">
            Administra las aplicaciones y realiza entrevistas de RH.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Buscar</label>
            <div className="mt-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Folio, candidato o puesto..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos</option>
              <option value="RevisionDeDocumentos">Revisión de Documentos</option>
              <option value="EntrevistaConRH">Entrevista con RH</option>
              <option value="EntrevistaConManager">Entrevista con Manager</option>
              <option value="Evaluando">Evaluando</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Applications table */}
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando aplicaciones...</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredApplications.map((application) => (
              <li key={application.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-8 w-8 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {application.candidate?.full_name}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {getStatusLabel(application.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Folio: {application.folio} • {application.vacancy?.position}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>Aplicó: {new Date(application.created_at).toLocaleDateString()}</span>
                        {application.scheduled_rh_at && (
                          <span className="ml-4 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            RH: {new Date(application.scheduled_rh_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {application.status === 'RevisionDeDocumentos' && (
                      <button
                        onClick={() => {
                          setSelectedApplication(application)
                          setShowScheduleModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Agendar entrevista RH"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    )}
                    {application.status === 'EntrevistaConRH' && !application.scheduled_rh_at && (
                      <button
                        onClick={() => {
                          setSelectedApplication(application)
                          setShowScheduleModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Agendar entrevista RH"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    )}
                    {application.status === 'EntrevistaConRH' && application.scheduled_rh_at && (
                      <button
                        onClick={() => handleStartInterview(application)}
                        className="text-green-600 hover:text-green-900"
                        title="Iniciar entrevista"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleViewInterview(application)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {applications && applications.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((currentPage - 1) * 20) + 1} a {Math.min(currentPage * 20, applications.total)} de {applications.total} aplicaciones
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(applications.total_pages, currentPage + 1))}
              disabled={currentPage === applications.total_pages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && selectedApplication && (
        <ScheduleInterviewModal
          application={selectedApplication}
          onClose={() => {
            setShowScheduleModal(false)
            setSelectedApplication(null)
          }}
          onSubmit={handleScheduleInterview}
        />
      )}

      {/* Interview Modal */}
      {showInterviewModal && selectedApplication && currentInterview && (
        <InterviewModal
          application={selectedApplication}
          interview={currentInterview}
          onClose={() => {
            setShowInterviewModal(false)
            setSelectedApplication(null)
            setCurrentInterview(null)
          }}
          onSave={async (answers, extraQuestions) => {
            await saveRHInterviewDraft(selectedApplication.id, answers, extraQuestions)
          }}
          onFinalize={async () => {
            await finalizeRHInterview(selectedApplication.id)
            setShowInterviewModal(false)
            setSelectedApplication(null)
            setCurrentInterview(null)
            loadApplications()
          }}
        />
      )}
    </div>
  )
}

// Schedule Interview Modal Component
function ScheduleInterviewModal({ 
  application, 
  onClose, 
  onSubmit 
}: { 
  application: Application
  onClose: () => void
  onSubmit: (applicationId: string, at: string, location: string) => void 
}) {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const at = new Date(`${formData.date}T${formData.time}`).toISOString()
      await onSubmit(application.id, at, formData.location)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Agendar Entrevista RH</h3>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            <strong>Candidato:</strong> {application.candidate?.full_name}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Folio:</strong> {application.folio}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Puesto:</strong> {application.vacancy?.position}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Hora</label>
            <input
              type="time"
              required
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Lugar</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Oficina Central, Sala de Juntas, etc."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Agendando...' : 'Agendar Entrevista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Interview Modal Component
function InterviewModal({ 
  application, 
  interview,
  onClose, 
  onSave,
  onFinalize
}: { 
  application: Application
  interview: RHInterview
  onClose: () => void
  onSave: (answers: InterviewAnswer[], extraQuestions: ExtraQuestion[]) => Promise<void>
  onFinalize: () => Promise<void>
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [extraQuestions, setExtraQuestions] = useState<ExtraQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isFinalized = !!interview.finished_at

  // Initialize answers from existing interview
  useEffect(() => {
    if (interview.answers) {
      const answerMap: Record<string, string> = {}
      interview.answers.forEach(answer => {
        answerMap[answer.question_id] = answer.answer_text
      })
      setAnswers(answerMap)
    }
    if (interview.extra_questions) {
      setExtraQuestions(interview.extra_questions)
    }
  }, [interview])

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      const answerArray: InterviewAnswer[] = Object.entries(answers).map(([question_id, answer_text]) => ({
        question_id,
        answer_text
      }))
      await onSave(answerArray, extraQuestions)
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    // Validate required questions
    const requiredQuestions = interview.question_bank_versions.questions.filter(q => q.is_required)
    const missingRequired = requiredQuestions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
    
    if (missingRequired.length > 0) {
      alert(`Faltan respuestas para las siguientes preguntas obligatorias:\n${missingRequired.map(q => `- ${q.text}`).join('\n')}`)
      return
    }

    setLoading(true)
    try {
      const answerArray: InterviewAnswer[] = Object.entries(answers).map(([question_id, answer_text]) => ({
        question_id,
        answer_text
      }))
      await onSave(answerArray, extraQuestions)
      await onFinalize()
    } finally {
      setLoading(false)
    }
  }

  const addExtraQuestion = () => {
    setExtraQuestions(prev => [...prev, { text: '', answer_text: '' }])
  }

  const updateExtraQuestion = (index: number, field: keyof ExtraQuestion, value: string) => {
    setExtraQuestions(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeExtraQuestion = (index: number) => {
    setExtraQuestions(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Entrevista RH - {application.candidate?.full_name}
          </h3>
          <div className="flex items-center space-x-2">
            {isFinalized && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Finalizada
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Folio:</strong> {application.folio}
            </div>
            <div>
              <strong>Puesto:</strong> {application.vacancy?.position}
            </div>
            <div>
              <strong>Banco:</strong> {interview.question_bank_versions.question_banks.name}
            </div>
            <div>
              <strong>Iniciada:</strong> {new Date(interview.started_at).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-6">
          {/* Standard Questions */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Preguntas del Banco</h4>
            {interview.question_bank_versions.questions
              .sort((a, b) => a.ord - b.ord)
              .map((question) => (
                <div key={question.id} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {question.ord}. {question.text}
                    {question.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={isFinalized}
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                    placeholder="Escriba la respuesta del candidato..."
                  />
                </div>
              ))}
          </div>

          {/* Extra Questions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">Preguntas Adicionales</h4>
              {!isFinalized && (
                <button
                  onClick={addExtraQuestion}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </button>
              )}
            </div>
            
            {extraQuestions.map((extra, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <input
                    type="text"
                    value={extra.text}
                    onChange={(e) => updateExtraQuestion(index, 'text', e.target.value)}
                    disabled={isFinalized}
                    placeholder="Pregunta adicional..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                  />
                  {!isFinalized && (
                    <button
                      onClick={() => removeExtraQuestion(index)}
                      className="ml-2 text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={extra.answer_text}
                  onChange={(e) => updateExtraQuestion(index, 'answer_text', e.target.value)}
                  disabled={isFinalized}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                  placeholder="Respuesta..."
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {isFinalized ? 'Cerrar' : 'Cancelar'}
          </button>
          {!isFinalized && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Borrador'}
              </button>
              <button
                onClick={handleFinalize}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Finalizando...' : 'Finalizar Entrevista'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}