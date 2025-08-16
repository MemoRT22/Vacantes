import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginForm } from './components/LoginForm'
import { PublicSite } from './components/PublicSite'
import { Layout } from './components/Layout'
import { UserManagement } from './components/UserManagement'
import { VacancyManagement } from './components/VacancyManagement'
import { ApplicationManagement } from './components/ApplicationManagement'
import { QuestionBankManagement } from './components/QuestionBankManagement'
import { EvaluationManagement } from './components/EvaluationManagement'
import { ManagerApplications } from './components/ManagerApplications'
import { RHDashboard } from './components/RHDashboard'

function AppContent() {
  const { user, profile, loading } = useAuth()
  const [currentView, setCurrentView] = React.useState('default')
  const [showPublicSite, setShowPublicSite] = React.useState(false)

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'public') {
        setShowPublicSite(true)
      } else if (hash === 'login') {
        setShowPublicSite(false)
        setCurrentView('login')
      } else {
        setShowPublicSite(false)
        setCurrentView(hash || 'default')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Set initial view

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Show public site by default or when explicitly requested
  if (showPublicSite || (!user && currentView !== 'login')) {
    return <PublicSite />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return <LoginForm />
  }

  return (
    <Layout>
      {profile.role === 'RH' ? (
        <>
          {currentView === 'dashboard' && <RHDashboard />}
          {currentView === 'users' && <UserManagement />}
          {currentView === 'vacancies' && <VacancyManagement />}
          {currentView === 'applications' && <ApplicationManagement />}
          {currentView === 'evaluation' && <EvaluationManagement />}
          {currentView === 'question-banks' && <QuestionBankManagement />}
          {currentView === 'default' && <RHDashboard />}
        </>
      ) : profile.role === 'MANAGER' ? (
        <>
          {currentView === 'manager-applications' && <ManagerApplications />}
          {currentView === 'default' && <ManagerApplications />}
        </>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">
            Bienvenido, {profile.full_name}
          </h2>
          <p className="mt-2 text-gray-600">
            Sistema de Contrataciones BinniBus
          </p>
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tu Perfil</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.full_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Rol</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.role}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {profile.active ? 'Activo' : 'Inactivo'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App