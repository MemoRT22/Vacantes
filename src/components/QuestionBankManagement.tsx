import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getQuestionBanks,
  importQuestionBankCSV,
  QuestionBank
} from '../lib/supabase'
import { 
  Upload, 
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Plus,
  Eye
} from 'lucide-react'

const QUESTION_BANK_KINDS = [
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'OPERADOR_UNIDADES', label: 'Operador de Unidades' },
  { value: 'GUARDIA_SEGURIDAD', label: 'Guardia de Seguridad' },
  { value: 'AUX_LIMPIEZA_UNIDADES', label: 'Auxiliar de Limpieza de Unidades' },
  { value: 'JEFE_PATIO', label: 'Jefe de Patio' },
  { value: 'AUXILIAR_PATIO', label: 'Auxiliar de Patio' },
  { value: 'TECNICOS', label: 'Técnicos (Mecánico/Hojalatería/Pintura/Eléctrico)' }
]

export function QuestionBankManagement() {
  const { profile } = useAuth()
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null)

  // Only allow RH users
  if (profile?.role !== 'RH') {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso denegado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Solo usuarios con rol RH pueden gestionar bancos de preguntas.
        </p>
      </div>
    )
  }

  const loadQuestionBanks = async () => {
    try {
      setLoading(true)
      const data = await getQuestionBanks()
      setQuestionBanks(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestionBanks()
  }, [])

  const handleImportSuccess = () => {
    setShowImportModal(false)
    loadQuestionBanks()
  }

  const handleViewBank = (bank: QuestionBank) => {
    setSelectedBank(bank)
    setShowViewModal(true)
  }

  const downloadSampleCSV = () => {
    const csvContent = `ord,text,is_required
1,"¿Cuéntame sobre tu experiencia laboral previa?",true
2,"¿Por qué te interesa trabajar en BinniBus?",true
3,"¿Cómo manejas situaciones de estrés?",false
4,"¿Tienes disponibilidad para trabajar en horarios rotativos?",true
5,"¿Qué esperas de este puesto?",false`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_question_bank.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Bancos de Preguntas</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona los bancos de preguntas para las entrevistas de RH.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <button
            type="button"
            onClick={downloadSampleCSV}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Ejemplo CSV
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Question Banks Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {QUESTION_BANK_KINDS.map((kind) => {
              const bank = questionBanks.find(b => b.kind === kind.value)
              const activeVersion = bank?.question_bank_versions?.[0]
              
              return (
                <div key={kind.value} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{kind.label}</h3>
                      {bank ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    
                    {bank && activeVersion ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <strong>Versión:</strong> {activeVersion.version}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Preguntas:</strong> {activeVersion.questions?.length || 0}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Creado:</strong> {new Date(activeVersion.created_at).toLocaleDateString()}
                        </p>
                        <div className="pt-4">
                          <button
                            onClick={() => handleViewBank(bank)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Preguntas
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No hay banco configurado</p>
                        <button
                          onClick={() => setShowImportModal(true)}
                          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Banco
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportCSVModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* View Bank Modal */}
      {showViewModal && selectedBank && (
        <ViewBankModal
          bank={selectedBank}
          onClose={() => {
            setShowViewModal(false)
            setSelectedBank(null)
          }}
        />
      )}
    </div>
  )
}

// Import CSV Modal Component
function ImportCSVModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void
  onSuccess: () => void 
}) {
  const [formData, setFormData] = useState({
    kind: '',
    version: '',
    activate: true,
    csvFile: null as File | null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Solo se permiten archivos CSV')
        return
      }
      setFormData({ ...formData, csvFile: file })
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.kind || !formData.csvFile) {
      setError('Selecciona un tipo de banco y un archivo CSV')
      return
    }

    setLoading(true)
    setError('')

    try {
      await importQuestionBankCSV(
        formData.kind,
        formData.csvFile,
        formData.version ? parseInt(formData.version) : undefined,
        formData.activate
      )
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Importar Banco de Preguntas</h3>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Banco *</label>
            <select
              required
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Seleccionar tipo...</option>
              {QUESTION_BANK_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Versión (opcional)</label>
            <input
              type="number"
              min="1"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Auto-incrementar"
            />
            <p className="mt-1 text-xs text-gray-500">
              Si no se especifica, se asignará automáticamente la siguiente versión
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Archivo CSV *</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Formato: ord, text, is_required (true/false)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.activate}
              onChange={(e) => setFormData({ ...formData, activate: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Activar esta versión automáticamente
            </label>
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
              {loading ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// View Bank Modal Component
function ViewBankModal({ 
  bank, 
  onClose 
}: { 
  bank: QuestionBank
  onClose: () => void 
}) {
  const activeVersion = bank.question_bank_versions?.[0]
  const questions = activeVersion?.questions || []

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {QUESTION_BANK_KINDS.find(k => k.value === bank.kind)?.label}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {activeVersion && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Versión:</strong> {activeVersion.version}
              </div>
              <div>
                <strong>Total de preguntas:</strong> {questions.length}
              </div>
              <div>
                <strong>Creado:</strong> {new Date(activeVersion.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Preguntas</h4>
          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions
                .sort((a, b) => a.ord - b.ord)
                .map((question) => (
                  <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {question.ord}. {question.text}
                        </p>
                      </div>
                      <div className="ml-4">
                        {question.is_required ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Obligatoria
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Opcional
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No hay preguntas en este banco</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}