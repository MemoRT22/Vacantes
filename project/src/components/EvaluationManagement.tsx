import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  listApplicationsForRH,
  getEvaluationContext,
  transitionToEvaluating,
  saveEvaluationScores,
  saveEvaluationSummary,
  finalizeAccept,
  finalizeReject,
  Application,
  ApplicationsResponse,
  EvaluationContext,
  EvaluationScore
} from '../lib/supabase'
import { 
  Search, 
  User,
  CheckCircle,
  XCircle,
  Eye,
  Star,
  Award,
  Save,
  Send,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'

export function EvaluationManagement() {
  const { profile } = useAuth()
  const [applications, setApplications] = useState<ApplicationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [evaluationContext, setEvaluationContext] = useState<EvaluationContext | null>(null)
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
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
          Solo usuarios con rol RH pueden realizar evaluaciones finales.
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

  const handleStartEvaluation = async (application: Application) => {
    try {
      await transitionToEvaluating(application.id)
      loadApplications()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleViewEvaluation = async (application: Application) => {
    try {
      const context = await getEvaluationContext(application.id)
      setEvaluationContext(context)
      setSelectedApplication(application)
      setShowEvaluationModal(true)
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

  const canStartEvaluation = (app: Application) => {
    return app.has_rh_interview && app.rh_interview_finished && 
           app.has_manager_interview && app.status === 'EntrevistaConManager'
  }

  const canViewEvaluation = (app: Application) => {
    return app.status === 'Evaluando' || app.status === 'Aceptado' || app.status === 'Rechazado'
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
          <h1 className="text-2xl font-semibold text-gray-900">Evaluación Final</h1>
          <p className="mt-2 text-sm text-gray-700">
            Realiza la evaluación final de candidatos con los 16 criterios y decide: Aceptar o Rechazar.
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
                        {application.has_manager_interview && (
                          <Star className="ml-2 h-4 w-4 text-yellow-500" title="Manager evaluó" />
                        )}
                        {(application.status === 'Aceptado' || application.status === 'Rechazado') && (
                          <Award className="ml-2 h-4 w-4 text-purple-500" title="Evaluación finalizada" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Folio: {application.folio} • {application.vacancy?.position}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>Aplicó: {new Date(application.created_at).toLocaleDateString()}</span>
                        {application.has_rh_interview && (
                          <span className="ml-4">✓ Entrevista RH</span>
                        )}
                        {application.has_manager_interview && (
                          <span className="ml-4">✓ Entrevista Manager</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canStartEvaluation(application) && (
                      <button
                        onClick={() => handleStartEvaluation(application)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Iniciar evaluación final"
                      >
                        <Award className="h-4 w-4" />
                      </button>
                    )}
                    {canViewEvaluation(application) && (
                      <button
                        onClick={() => handleViewEvaluation(application)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Ver/realizar evaluación"
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

      {/* Evaluation Modal */}
      {showEvaluationModal && selectedApplication && evaluationContext && (
        <EvaluationModal
          application={selectedApplication}
          context={evaluationContext}
          onClose={() => {
            setShowEvaluationModal(false)
            setSelectedApplication(null)
            setEvaluationContext(null)
          }}
          onSave={async () => {
            loadApplications()
          }}
        />
      )}
    </div>
  )
}

// Evaluation Modal Component
function EvaluationModal({ 
  application, 
  context,
  onClose, 
  onSave
}: { 
  application: Application
  context: EvaluationContext
  onClose: () => void
  onSave: () => Promise<void>
}) {
  const [scores, setScores] = useState<Record<number, number>>({})
  const [summary, setSummary] = useState({
    factors_for: '',
    factors_against: '',
    conclusion: '',
    references_laborales: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isFinalized = context.application.status === 'Aceptado' || context.application.status === 'Rechazado'

  // Initialize scores and summary from context
  useEffect(() => {
    if (context.scores) {
      const scoreMap: Record<number, number> = {}
      context.scores.forEach(score => {
        scoreMap[score.criterion_id] = score.score
      })
      setScores(scoreMap)
    }
    
    if (context.evaluation.exists) {
      setSummary({
        factors_for: context.evaluation.factors_for || '',
        factors_against: context.evaluation.factors_against || '',
        conclusion: context.evaluation.conclusion || '',
        references_laborales: context.evaluation.references_laborales || ''
      })
    }
  }, [context])

  const handleScoreChange = (criterionId: number, score: number) => {
    setScores(prev => ({ ...prev, [criterionId]: score }))
  }

  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0)
  }

  const handleSaveScores = async () => {
    setSaving(true)
    try {
      const scoresArray: EvaluationScore[] = context.criteria.map(criterion => ({
        criterion_id: criterion.id,
        score: (scores[criterion.id] || 1) as 1 | 2 | 3 | 4 | 5
      }))
      
      await saveEvaluationScores(application.id, scoresArray)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSummary = async () => {
    setSaving(true)
    try {
      await saveEvaluationSummary(
        application.id,
        summary.factors_for,
        summary.factors_against,
        summary.conclusion,
        summary.references_laborales
      )
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async (accept: boolean) => {
    // Validate all scores are set
    const missingScores = context.criteria.filter(c => !scores[c.id])
    if (missingScores.length > 0) {
      alert(`Faltan calificaciones para: ${missingScores.map(c => c.name).join(', ')}`)
      return
    }

    // Validate summary fields
    if (!summary.factors_for.trim() || !summary.factors_against.trim() || !summary.conclusion.trim()) {
      alert('Todos los campos de conclusión son obligatorios')
      return
    }

    setLoading(true)
    try {
      // Save scores and summary first
      await handleSaveScores()
      await handleSaveSummary()
      
      // Finalize
      if (accept) {
        await finalizeAccept(application.id)
      } else {
        await finalizeReject(application.id)
      }
      
      await onSave()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const formacionCriteria = context.criteria.filter(c => c.grp === 'FORMACION_Y_EXPERIENCIA').sort((a, b) => a.ord - b.ord)
  const socialCriteria = context.criteria.filter(c => c.grp === 'AREA_SOCIAL').sort((a, b) => a.ord - b.ord)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Evaluación Final - {context.application.candidate.full_name}
          </h3>
          <div className="flex items-center space-x-2">
            {isFinalized && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                context.application.status === 'Aceptado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {context.application.status === 'Aceptado' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aceptado
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Rechazado
                  </>
                )}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Application Info */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Información</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Folio:</strong> {context.application.folio}</p>
                <p><strong>Puesto:</strong> {context.application.vacancy.position}</p>
                <p><strong>Email:</strong> {context.application.candidate.email}</p>
                <p><strong>Teléfono:</strong> {context.application.candidate.phone}</p>
              </div>
            </div>

            {/* Manager Score */}
            {context.interview_manager.exists && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Evaluación Manager</h4>
                <div className="text-sm">
                  <p><strong>Calificación:</strong> {context.interview_manager.score}/100</p>
                  {context.interview_manager.notes && (
                    <div className="mt-2">
                      <strong>Observaciones:</strong>
                      <p className="text-gray-700 mt-1">{context.interview_manager.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle Column - Evaluation Criteria */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Criterios de Evaluación</h4>
                <div className="text-sm text-gray-600">
                  Total: <span className="font-bold text-lg">{calculateTotal()}/80</span>
                </div>
              </div>

              {/* Formación y Experiencia */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-800 mb-3">Formación y Experiencia</h5>
                <div className="space-y-3">
                  {formacionCriteria.map((criterion) => (
                    <div key={criterion.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 flex-1">{criterion.name}</span>
                      <div className="flex space-x-1 ml-4">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            onClick={() => !isFinalized && handleScoreChange(criterion.id, score)}
                            disabled={isFinalized}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                              scores[criterion.id] === score
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } ${isFinalized ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Área Social */}
              <div>
                <h5 className="font-medium text-gray-800 mb-3">Área Social</h5>
                <div className="space-y-3">
                  {socialCriteria.map((criterion) => (
                    <div key={criterion.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 flex-1">{criterion.name}</span>
                      <div className="flex space-x-1 ml-4">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            onClick={() => !isFinalized && handleScoreChange(criterion.id, score)}
                            disabled={isFinalized}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                              scores[criterion.id] === score
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } ${isFinalized ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!isFinalized && (
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={handleSaveScores}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar Calificaciones'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Conclusiones</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factores a Favor *
                  </label>
                  <textarea
                    rows={3}
                    value={summary.factors_for}
                    onChange={(e) => !isFinalized && setSummary({ ...summary, factors_for: e.target.value })}
                    disabled={isFinalized}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                    placeholder="Aspectos positivos del candidato..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factores en Contra *
                  </label>
                  <textarea
                    rows={3}
                    value={summary.factors_against}
                    onChange={(e) => !isFinalized && setSummary({ ...summary, factors_against: e.target.value })}
                    disabled={isFinalized}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                    placeholder="Aspectos a considerar del candidato..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conclusión *
                  </label>
                  <textarea
                    rows={3}
                    value={summary.conclusion}
                    onChange={(e) => !isFinalized && setSummary({ ...summary, conclusion: e.target.value })}
                    disabled={isFinalized}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                    placeholder="Conclusión final sobre el candidato..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencias Laborales
                  </label>
                  <textarea
                    rows={2}
                    value={summary.references_laborales}
                    onChange={(e) => !isFinalized && setSummary({ ...summary, references_laborales: e.target.value })}
                    disabled={isFinalized}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                    placeholder="Referencias laborales verificadas..."
                  />
                </div>

                {!isFinalized && (
                  <button
                    onClick={handleSaveSummary}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar Conclusiones'}
                  </button>
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
            {isFinalized ? 'Cerrar' : 'Cancelar'}
          </button>
          {!isFinalized && (
            <>
              <button
                onClick={() => handleFinalize(false)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                {loading ? 'Procesando...' : 'Rechazar Candidato'}
              </button>
              <button
                onClick={() => handleFinalize(true)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                {loading ? 'Procesando...' : 'Aceptar Candidato'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}