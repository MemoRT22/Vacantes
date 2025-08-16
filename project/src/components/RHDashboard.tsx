import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getDashboardSummary,
  listApplicationsAdmin,
  exportApplicationsCSV,
  refreshDashboardViews,
  DashboardSummary,
  AdminApplicationsResponse,
  getActiveManagers
} from '../lib/supabase'
import { 
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Download,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'

export function RHDashboard() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [applications, setApplications] = useState<AdminApplicationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    vacancy_id: '',
    status: '',
    q: '',
    from: '',
    to: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [vacancies, setVacancies] = useState<any[]>([])

  // Only allow RH users
  if (profile?.role !== 'RH') {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso denegado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Solo usuarios con rol RH pueden ver el dashboard.
        </p>
      </div>
    )
  }

  const loadSummary = async () => {
    try {
      setLoading(true)
      const data = await getDashboardSummary({
        from: filters.from || undefined,
        to: filters.to || undefined
      })
      setSummary(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadApplications = async () => {
    try {
      setApplicationsLoading(true)
      const data = await listApplicationsAdmin({
        page: currentPage,
        page_size: 20,
        vacancy_id: filters.vacancy_id || undefined,
        status: filters.status || undefined,
        q: filters.q || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined
      })
      setApplications(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setApplicationsLoading(false)
    }
  }

  const loadVacancies = async () => {
    try {
      const { data, error } = await supabase
        .from('vacancies')
        .select('id, position, type, is_active')
        .eq('is_active', true)
        .order('position')
      
      if (error) throw error
      setVacancies(data || [])
    } catch (err: any) {
      console.error('Error loading vacancies:', err.message)
    }
  }

  useEffect(() => {
    loadSummary()
    loadVacancies()
  }, [filters.from, filters.to])

  useEffect(() => {
    loadApplications()
  }, [currentPage, filters])

  const handleRefreshViews = async () => {
    try {
      setRefreshing(true)
      await refreshDashboardViews()
      await loadSummary()
      await loadApplications()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleExportCSV = async (vacancyId: string) => {
    try {
      setExporting(vacancyId)
      const result = await exportApplicationsCSV({
        vacancy_id: vacancyId,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined
      })
      
      // Download the file
      const link = document.createElement('a')
      link.href = result.url
      link.download = result.filename
      link.click()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExporting(null)
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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard RH</h1>
          <p className="mt-2 text-sm text-gray-700">
            Métricas operativas y gestión de candidatos.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={handleRefreshViews}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar Datos'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Date Range Filter */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha Desde</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha Hasta</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : summary && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Vacantes Activas</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.active_vacancies}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Aplicaciones</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.applications_total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aceptados</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.applications_by_status.Aceptado || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rechazados</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.applications_by_status.Rechazado || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applications by Status */}
      {summary && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Aplicaciones por Etapa</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(summary.applications_by_status).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                  {getStatusLabel(status)}
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Average Times */}
      {summary && Object.keys(summary.avg_time_by_stage_hours).length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tiempos Promedio por Etapa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(summary.avg_time_by_stage_hours).map(([transition, hours]) => (
              <div key={transition} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">{transition}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{hours}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accept/Reject Rates by Vacancy */}
      {summary && summary.accept_reject_rate_by_vacancy.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tasa de Aceptación/Rechazo por Vacante</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Puesto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aceptados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rechazados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasa Aceptación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.accept_reject_rate_by_vacancy.map((vacancy) => {
                  const acceptRate = vacancy.total > 0 ? ((vacancy.accepted / vacancy.total) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={vacancy.vacancy_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vacancy.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vacancy.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {vacancy.accepted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {vacancy.rejected}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {acceptRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleExportCSV(vacancy.vacancy_id)}
                          disabled={exporting === vacancy.vacancy_id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {exporting === vacancy.vacancy_id ? 'Exportando...' : 'CSV'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Applications List */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Listado de Aplicaciones</h3>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Buscar</label>
              <div className="mt-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Folio o nombre..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Vacante</label>
              <select
                value={filters.vacancy_id}
                onChange={(e) => setFilters({ ...filters, vacancy_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Todas</option>
                {vacancies.map((vacancy) => (
                  <option key={vacancy.id} value={vacancy.id}>
                    {vacancy.position}
                  </option>
                ))}
              </select>
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

        {/* Applications Table */}
        <div className="overflow-x-auto">
          {applicationsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-500">Cargando aplicaciones...</p>
            </div>
          ) : applications && applications.items.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Folio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Puesto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.items.map((app) => (
                  <tr key={app.application_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.folio}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{app.candidate_full_name}</div>
                        <div className="text-sm text-gray-500">{app.candidate_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.vacancy_position}</div>
                      <div className="text-sm text-gray-500">{app.vacancy_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.manager_full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay aplicaciones</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron aplicaciones con los filtros seleccionados.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {applications && applications.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
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
      </div>
    </div>
  )
}