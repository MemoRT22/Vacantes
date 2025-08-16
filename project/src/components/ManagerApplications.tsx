import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  listManagerApplications,
  getManagerInterviewContext,
  transitionToManagerInterview,
  saveManagerResult,
  ManagerApplication,
  ManagerApplicationsResponse,
  ManagerInterviewContext
} from '../lib/supabase'
import { 
  Search, 
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Save,
  Star
} from 'lucide-react'

export function ManagerApplications() {
  const { profile } = useAuth()
  const [applications, setApplications] = useState<ManagerApplicationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<ManagerApplication | null>(null)
  const [interviewContext, setInterviewContext] = useState<ManagerInterviewContext | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)

  // Only allow Manager users
  if (profile?.role !== 'MANAGER') {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso denegado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Solo usuarios con rol Manager pueden ver sus aplicaciones.
        </p>
      </div>
    )
  }

  const loadApplications = async () => {
    try {
      setLoading(true)
      const data = await listManagerApplications({
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
      await transitionToManagerInterview(applicationId, at, location)
      setShowScheduleModal(false)
      setSelectedApplication(null)
      loadApplications()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleViewInterview = async (application: ManagerApplication) => {
    try {
      const context = await getManagerInterviewContext(application.id)
      setInterviewContext(context)
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

  const canScheduleInterview = (app: ManagerApplication) => {
    return app.has_rh_interview && app.rh_interview_finished && 
           (app.status === 'EntrevistaConRH' || app.status === 'EntrevistaConManager')
  }

  const canViewInterview = (app: ManagerApplication) => {
    return app.has_rh_interview && app.rh_interview_finished
  }

  const filteredApplications = applications?.items.filter(app => 
    app.candidate.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    app.folio.toLowerCase().includes(filters.search.toLowerCase()) ||
    app.vacancy.position.toLowerCase().includes(filters.search.toLowerCase())
  ) || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Mis Aplicaciones</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona las aplicaciones para tus vacantes asignadas.
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
                          {application.candidate.full_name}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {getStatusLabel(application.status)}
                        </span>
                        {application.has_manager_interview && (
                          <Star className="ml-2 h-4 w-4 text-yellow-500" title="Entrevista completada" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Folio: {application.folio} • {application.vacancy.position}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>Aplicó: {new Date(application.created_at).toLocaleDateString()}</span>
                        {application.scheduled_manager_at && (
                          <span className="ml-4 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Manager: {new Date(application.scheduled_manager_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canScheduleInterview(application) && (
                      <button
                        onClick={() => {
                          setSelectedApplication(application)
                          setShowScheduleModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Agendar entrevista"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    )}
                    {canViewInterview(application) && (
                      <button
                        onClick={() => handleViewInterview(application)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Ver contexto y realizar entrevista"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
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
        <ScheduleManagerInterviewModal
          application={selectedApplication}
          onClose={() => {
            setShowScheduleModal(false)
            setSelectedApplication(null)
          }}
          onSubmit={handleScheduleInterview}
        />
      )}

      {/* Interview Context Modal */}
      {showInterviewModal && selectedApplication && interviewContext && (
        <ManagerInterviewModal
          application={selectedApplication}
          context={interviewContext}
          onClose={() => {
            setShowInterviewModal(false)
            setSelectedApplication(null)
            setInterviewContext(null)
          }}
          onSave={async (score, notes) => {
            await saveManagerResult(selectedApplication.id, score, notes)
            loadApplications()
          }}
        />
      )}
    </div>
  )
}

// Schedule Manager Interview Modal Component
function ScheduleManagerInterviewModal({ 
  application, 
  onClose, 
  onSubmit 
}: { 
  application: ManagerApplication
  onClose: () => void
  onSubmit: (applicationId: string, at: string, location: string) => void 
}) {
  const [formData, setFormData] = useState({
    date: application.scheduled_manager_at ? 
      new Date(application.scheduled_manager_at).toISOString().split('T')[0] : '',
    time: application.scheduled_manager_at ? 
      new Date(application.scheduled_manager_at).toTimeString().slice(0, 5) : '',
    location: application.scheduled_manager_location || ''
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {application.scheduled_manager_at ? 'Actualizar' : 'Agendar'} Entrevista Manager
        </h3>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            <strong>Candidato:</strong> {application.candidate.full_name}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Folio:</strong> {application.folio}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Puesto:</strong> {application.vacancy.position}
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
              placeholder="Oficina, Depósito, etc."
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
              {loading ? 'Guardando...' : (application.scheduled_manager_at ? 'Actualizar' : 'Agendar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Manager Interview Modal Component
function ManagerInterviewModal({ 
  application, 
  context,
  onClose, 
  onSave
}: { 
  application: ManagerApplication
  context: ManagerInterviewContext
  onClose: () => void
  onSave: (score: number, notes: string) => Promise<void>
}) {
  const [score, setScore] = useState(context.interview_manager.score || 0)
  const [notes, setNotes] = useState(context.interview_manager.notes || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (score < 0 || score > 100) {
      alert('La calificación debe estar entre 0 y 100')
      return
    }

    setLoading(true)
    try {
      await onSave(score, notes)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Contexto de Entrevista - {context.application.candidate.full_name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Application Info & RH Interview */}
          <div className="space-y-6">
            {/* Application Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Información de la Aplicación</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Folio:</strong> {context.application.folio}
                </div>
                <div>
                  <strong>Estado:</strong> {getStatusLabel(context.application.status)}
                </div>
                <div>
                  <strong>Puesto:</strong> {context.application.vacancy.position}
                </div>
                <div>
                  <strong>Tipo:</strong> {context.application.vacancy.type}
                </div>
                <div>
                  <strong>Email:</strong> {context.application.candidate.email}
                </div>
                <div>
                  <strong>Teléfono:</strong> {context.application.candidate.phone}
                </div>
              </div>

              {/* Schedules */}
              {(context.application.schedules.rh || context.application.schedules.manager) && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-700 mb-2">Agendas</h5>
                  {context.application.schedules.rh && (
                    <p className="text-sm text-gray-600">
                      <strong>RH:</strong> {new Date(context.application.schedules.rh.at).toLocaleString()} 
                      - {context.application.schedules.rh.location}
                    </p>
                  )}
                  {context.application.schedules.manager && (
                    <p className="text-sm text-gray-600">
                      <strong>Manager:</strong> {new Date(context.application.schedules.manager.at).toLocaleString()} 
                      - {context.application.schedules.manager.location}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* RH Interview */}
            {context.interview_rh && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Entrevista RH (Solo Lectura)</h4>
                <div className="text-sm text-gray-600 mb-4">
                  <p><strong>Finalizada:</strong> {new Date(context.interview_rh.finished_at!).toLocaleString()}</p>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {context.interview_rh.questions
                    .sort((a, b) => a.ord - b.ord)
                    .map((question) => {
                      const answer = context.interview_rh!.answers.find(a => a.question_id === question.id)
                      return (
                        <div key={question.id} className="border-b border-blue-200 pb-2">
                          <p className="font-medium text-gray-800 text-sm">
                            {question.ord}. {question.text}
                            {question.is_required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          <p className="text-gray-700 text-sm mt-1">
                            {answer?.answer_text || 'Sin respuesta'}
                          </p>
                        </div>
                      )
                    })}
                  
                  {context.interview_rh.extra_questions.map((extra, index) => (
                    <div key={index} className="border-b border-blue-200 pb-2">
                      <p className="font-medium text-gray-800 text-sm">{extra.text}</p>
                      <p className="text-gray-700 text-sm mt-1">{extra.answer_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Manager Interview */}
          <div className="space-y-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Mi Evaluación</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calificación (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows={8}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Escribe tus observaciones sobre el candidato..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  />
                </div>

                {context.interview_manager.exists && context.interview_manager.created_at && (
                  <div className="text-xs text-gray-500">
                    <p>Última actualización: {new Date(context.interview_manager.created_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Evaluación'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper function for status labels
function getStatusLabel(status: string) {
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