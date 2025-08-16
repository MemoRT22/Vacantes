import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  listVacanciesAdmin, 
  listMyVacancies,
  createVacancy, 
  updateVacancy,
  getVacancy,
  setVacancyRequiredDocs,
  getActiveManagers,
  Vacancy,
  VacanciesResponse,
  CreateVacancyData,
  UpdateVacancyData,
  RequiredDoc,
  StaffUser,
  DOC_TYPES,
  DOC_TYPE_LABELS
} from '../lib/supabase'
import { 
  Plus, 
  Edit2, 
  Eye,
  Search, 
  Filter,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  FileText,
  User as UserIcon
} from 'lucide-react'

export function VacancyManagement() {
  const { profile } = useAuth()
  const [vacancies, setVacancies] = useState<VacanciesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null)
  const [viewingVacancy, setViewingVacancy] = useState<Vacancy | null>(null)
  const [managers, setManagers] = useState<StaffUser[]>([])
  const [filters, setFilters] = useState({
    type: '',
    is_active: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)

  // Debug the profile and role
  console.log('Profile in VacancyManagement:', profile)
  console.log('Profile role:', profile?.role)
  console.log('Role comparison:', profile?.role === 'RH')
  
  const isRH = profile?.role === 'RH'
  
  console.log('isRH result:', isRH)

  const loadVacancies = async () => {
    try {
      setLoading(true)
      const data = isRH 
        ? await listVacanciesAdmin(currentPage, filters)
        : await listMyVacancies(currentPage, filters)
      setVacancies(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadManagers = async () => {
    try {
      const data = await getActiveManagers()
      setManagers(data)
    } catch (err: any) {
      console.error('Error loading managers:', err.message)
    }
  }

  useEffect(() => {
    loadVacancies()
  }, [currentPage, filters, isRH])

  useEffect(() => {
    if (isRH) {
      loadManagers()
    }
  }, [isRH])

  const handleCreateVacancy = async (vacancyData: CreateVacancyData) => {
    try {
      await createVacancy(vacancyData)
      setShowCreateModal(false)
      loadVacancies()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUpdateVacancy = async (id: string, vacancyData: UpdateVacancyData) => {
    try {
      await updateVacancy(id, vacancyData)
      setEditingVacancy(null)
      loadVacancies()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleViewVacancy = async (vacancy: Vacancy) => {
    try {
      const fullVacancy = await getVacancy(vacancy.id)
      setViewingVacancy(fullVacancy)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filteredVacancies = vacancies?.items.filter(vacancy => 
    vacancy.position.toLowerCase().includes(filters.search.toLowerCase()) ||
    vacancy.manager_name?.toLowerCase().includes(filters.search.toLowerCase())
  ) || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            {isRH ? 'Gestión de Vacantes' : 'Mis Vacantes'}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {isRH 
              ? 'Administra todas las vacantes del sistema.'
              : 'Consulta las vacantes asignadas a ti.'
            }
          </p>
        </div>
        {isRH && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Vacante
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Buscar</label>
            <div className="mt-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Puesto o manager..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos</option>
              <option value="ADMINISTRATIVO">Administrativo</option>
              <option value="OPERATIVO">Operativo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Vacancies table */}
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando vacantes...</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredVacancies.map((vacancy) => (
              <li key={vacancy.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {vacancy.type === 'ADMINISTRATIVO' ? (
                        <Building2 className="h-8 w-8 text-blue-600" />
                      ) : (
                        <Users className="h-8 w-8 text-orange-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{vacancy.position}</p>
                        {vacancy.is_active ? (
                          <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="ml-2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Manager: {vacancy.manager_name}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vacancy.type === 'ADMINISTRATIVO' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {vacancy.type}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          Creado: {new Date(vacancy.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewVacancy(vacancy)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {isRH && (
                      <button
                        onClick={() => setEditingVacancy(vacancy)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
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
      {vacancies && vacancies.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((currentPage - 1) * 20) + 1} a {Math.min(currentPage * 20, vacancies.total)} de {vacancies.total} vacantes
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
              onClick={() => setCurrentPage(Math.min(vacancies.total_pages, currentPage + 1))}
              disabled={currentPage === vacancies.total_pages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Create Vacancy Modal */}
      {showCreateModal && (
        <CreateVacancyModal
          managers={managers}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateVacancy}
        />
      )}

      {/* Edit Vacancy Modal */}
      {editingVacancy && (
        <EditVacancyModal
          vacancy={editingVacancy}
          managers={managers}
          onClose={() => setEditingVacancy(null)}
          onSubmit={(vacancyData) => handleUpdateVacancy(editingVacancy.id, vacancyData)}
        />
      )}

      {/* View Vacancy Modal */}
      {viewingVacancy && (
        <ViewVacancyModal
          vacancy={viewingVacancy}
          onClose={() => setViewingVacancy(null)}
        />
      )}
    </div>
  )
}

// Create Vacancy Modal Component
function CreateVacancyModal({ 
  managers,
  onClose, 
  onSubmit 
}: { 
  managers: StaffUser[]
  onClose: () => void
  onSubmit: (data: CreateVacancyData) => void 
}) {
  const [formData, setFormData] = useState<CreateVacancyData>({
    type: 'ADMINISTRATIVO',
    position: '',
    objetivos: '',
    funciones: '',
    escolaridad: '',
    experiencia_minima: '',
    conocimientos_tecnicos: '',
    habilidades: '',
    manager_id: '',
    is_active: true,
    required_docs: []
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  const addRequiredDoc = () => {
    setFormData({
      ...formData,
      required_docs: [...(formData.required_docs || []), { doc: DOC_TYPES[0], phase: 'NECESARIO' }]
    })
  }

  const removeRequiredDoc = (index: number) => {
    const newDocs = [...(formData.required_docs || [])]
    newDocs.splice(index, 1)
    setFormData({ ...formData, required_docs: newDocs })
  }

  const updateRequiredDoc = (index: number, field: keyof RequiredDoc, value: string) => {
    const newDocs = [...(formData.required_docs || [])]
    newDocs[index] = { ...newDocs[index], [field]: value }
    setFormData({ ...formData, required_docs: newDocs })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Vacante</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ADMINISTRATIVO' | 'OPERATIVO' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ADMINISTRATIVO">Administrativo</option>
                <option value="OPERATIVO">Operativo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Puesto *</label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Manager *</label>
              <select
                required
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Seleccionar manager...</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">Vacante activa</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Objetivos</label>
              <textarea
                rows={3}
                value={formData.objetivos}
                onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Funciones</label>
              <textarea
                rows={3}
                value={formData.funciones}
                onChange={(e) => setFormData({ ...formData, funciones: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Escolaridad</label>
              <input
                type="text"
                value={formData.escolaridad}
                onChange={(e) => setFormData({ ...formData, escolaridad: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Experiencia Mínima</label>
              <input
                type="text"
                value={formData.experiencia_minima}
                onChange={(e) => setFormData({ ...formData, experiencia_minima: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Conocimientos Técnicos</label>
              <textarea
                rows={2}
                value={formData.conocimientos_tecnicos}
                onChange={(e) => setFormData({ ...formData, conocimientos_tecnicos: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Habilidades</label>
              <textarea
                rows={2}
                value={formData.habilidades}
                onChange={(e) => setFormData({ ...formData, habilidades: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Required Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Documentos Requeridos</label>
              <button
                type="button"
                onClick={addRequiredDoc}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </button>
            </div>
            
            {formData.required_docs?.map((doc, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <select
                  value={doc.doc}
                  onChange={(e) => updateRequiredDoc(index, 'doc', e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {DOC_TYPES.map((docType) => (
                    <option key={docType} value={docType}>
                      {DOC_TYPE_LABELS[docType]}
                    </option>
                  ))}
                </select>
                <select
                  value={doc.phase}
                  onChange={(e) => updateRequiredDoc(index, 'phase', e.target.value as 'NECESARIO' | 'DESPUES')}
                  className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="NECESARIO">Necesario</option>
                  <option value="DESPUES">Después</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeRequiredDoc(index)}
                  className="text-red-600 hover:text-red-900"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
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
              {loading ? 'Creando...' : 'Crear Vacante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Vacancy Modal Component
function EditVacancyModal({ 
  vacancy,
  managers,
  onClose, 
  onSubmit 
}: { 
  vacancy: Vacancy
  managers: StaffUser[]
  onClose: () => void
  onSubmit: (data: UpdateVacancyData) => void 
}) {
  const [formData, setFormData] = useState<UpdateVacancyData>({
    type: vacancy.type,
    position: vacancy.position,
    objetivos: vacancy.objetivos || '',
    funciones: vacancy.funciones || '',
    escolaridad: vacancy.escolaridad || '',
    experiencia_minima: vacancy.experiencia_minima || '',
    conocimientos_tecnicos: vacancy.conocimientos_tecnicos || '',
    habilidades: vacancy.habilidades || '',
    manager_id: vacancy.manager_id,
    is_active: vacancy.is_active
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Vacante</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ADMINISTRATIVO' | 'OPERATIVO' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ADMINISTRATIVO">Administrativo</option>
                <option value="OPERATIVO">Operativo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Puesto</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Manager</label>
              <select
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">Vacante activa</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Objetivos</label>
              <textarea
                rows={3}
                value={formData.objetivos}
                onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Funciones</label>
              <textarea
                rows={3}
                value={formData.funciones}
                onChange={(e) => setFormData({ ...formData, funciones: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Escolaridad</label>
              <input
                type="text"
                value={formData.escolaridad}
                onChange={(e) => setFormData({ ...formData, escolaridad: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Experiencia Mínima</label>
              <input
                type="text"
                value={formData.experiencia_minima}
                onChange={(e) => setFormData({ ...formData, experiencia_minima: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Conocimientos Técnicos</label>
              <textarea
                rows={2}
                value={formData.conocimientos_tecnicos}
                onChange={(e) => setFormData({ ...formData, conocimientos_tecnicos: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Habilidades</label>
              <textarea
                rows={2}
                value={formData.habilidades}
                onChange={(e) => setFormData({ ...formData, habilidades: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// View Vacancy Modal Component
function ViewVacancyModal({ 
  vacancy,
  onClose
}: { 
  vacancy: Vacancy
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Detalles de la Vacante</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <p className="mt-1 text-sm text-gray-900">{vacancy.type}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Puesto</label>
              <p className="mt-1 text-sm text-gray-900">{vacancy.position}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Manager</label>
              <p className="mt-1 text-sm text-gray-900">{vacancy.manager_name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <div className="mt-1 flex items-center">
                {vacancy.is_active ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-700">Activa</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-sm text-red-700">Inactiva</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {vacancy.objetivos && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Objetivos</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{vacancy.objetivos}</p>
            </div>
          )}

          {vacancy.funciones && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Funciones</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{vacancy.funciones}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vacancy.escolaridad && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Escolaridad</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.escolaridad}</p>
              </div>
            )}

            {vacancy.experiencia_minima && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Experiencia Mínima</label>
                <p className="mt-1 text-sm text-gray-900">{vacancy.experiencia_minima}</p>
              </div>
            )}
          </div>

          {vacancy.conocimientos_tecnicos && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Conocimientos Técnicos</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{vacancy.conocimientos_tecnicos}</p>
            </div>
          )}

          {vacancy.habilidades && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Habilidades</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{vacancy.habilidades}</p>
            </div>
          )}

          {/* Required Documents */}
          {vacancy.required_docs && vacancy.required_docs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Documentos Requeridos</label>
              <div className="space-y-2">
                {vacancy.required_docs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-900">{DOC_TYPE_LABELS[doc.doc]}</span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doc.phase === 'NECESARIO' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {doc.phase === 'NECESARIO' ? 'Necesario' : 'Después'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p>Creado: {new Date(vacancy.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
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