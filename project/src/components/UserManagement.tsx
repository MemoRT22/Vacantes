import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  listStaffUsers, 
  createStaffUser, 
  updateStaffUser, 
  deleteStaffUser,
  StaffUser,
  StaffUsersResponse 
} from '../lib/supabase'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter,
  UserCheck,
  UserX,
  Shield,
  User as UserIcon
} from 'lucide-react'

export function UserManagement() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<StaffUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null)
  const [filters, setFilters] = useState({
    role: '',
    active: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)

  // Only allow RH users
  if (profile?.role !== 'RH') {
    return (
      <div className="text-center py-12">
        <UserX className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso denegado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Solo usuarios con rol RH pueden gestionar usuarios.
        </p>
      </div>
    )
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await listStaffUsers({
        page: currentPage,
        page_size: 20,
        role: filters.role as 'RH' | 'MANAGER' | undefined,
        active: filters.active ? filters.active === 'true' : undefined
      })
      setUsers(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [currentPage, filters])

  const handleCreateUser = async (userData: {
    full_name: string
    email: string
    role: 'RH' | 'MANAGER'
    active: boolean
  }) => {
    try {
      await createStaffUser(userData)
      setShowCreateModal(false)
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUpdateUser = async (id: string, userData: Partial<StaffUser>) => {
    try {
      await updateStaffUser(id, userData)
      setEditingUser(null)
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return
    }

    try {
      await deleteStaffUser(id)
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filteredUsers = users?.items.filter(user => 
    user.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    user.email.toLowerCase().includes(filters.search.toLowerCase())
  ) || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
          <p className="mt-2 text-sm text-gray-700">
            Administra los usuarios internos del sistema (RH y Managers).
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Usuario
          </button>
        </div>
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
                placeholder="Nombre o email..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos</option>
              <option value="RH">RH</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              value={filters.active}
              onChange={(e) => setFilters({ ...filters, active: e.target.value })}
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

      {/* Users table */}
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando usuarios...</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {user.role === 'RH' ? (
                        <Shield className="h-8 w-8 text-indigo-600" />
                      ) : (
                        <UserIcon className="h-8 w-8 text-green-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        {user.active ? (
                          <UserCheck className="ml-2 h-4 w-4 text-green-500" />
                        ) : (
                          <UserX className="ml-2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'RH' 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          Creado: {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {users && users.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((currentPage - 1) * 20) + 1} a {Math.min(currentPage * 20, users.total)} de {users.total} usuarios
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
              onClick={() => setCurrentPage(Math.min(users.total_pages, currentPage + 1))}
              disabled={currentPage === users.total_pages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(userData) => handleUpdateUser(editingUser.id, userData)}
        />
      )}
    </div>
  )
}

// Create User Modal Component
function CreateUserModal({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void
  onSubmit: (data: any) => void 
}) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'MANAGER' as 'RH' | 'MANAGER',
    active: true
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
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Usuario</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'RH' | 'MANAGER' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="MANAGER">Manager</option>
              <option value="RH">RH</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Usuario activo</label>
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
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit User Modal Component
function EditUserModal({ 
  user, 
  onClose, 
  onSubmit 
}: { 
  user: StaffUser
  onClose: () => void
  onSubmit: (data: any) => void 
}) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    active: user.active
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
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Usuario</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'RH' | 'MANAGER' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="MANAGER">Manager</option>
              <option value="RH">RH</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Usuario activo</label>
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