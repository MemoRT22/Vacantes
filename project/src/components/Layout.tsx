import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Users, User, Shield, Building2, FileText, Award, BarChart3 } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  Sistema BinniBus
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {profile?.role === 'RH' ? (
                    <Shield className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <User className="h-4 w-4 text-green-600" />
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-gray-500">{profile?.role}</p>
                  </div>
                </div>
              </div>

              {/* Sign out button */}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {profile?.role === 'RH' && (
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <a
                href="#dashboard"
                className="border-indigo-500 text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </a>
              <a
                href="#users"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <Users className="h-4 w-4 mr-2" />
                Gestión de Usuarios
              </a>
              <a
                href="#vacancies"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Gestión de Vacantes
              </a>
              <a
                href="#applications"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <FileText className="h-4 w-4 mr-2" />
                Aplicaciones
              </a>
              <a
                href="#evaluation"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <Award className="h-4 w-4 mr-2" />
                Evaluación Final
              </a>
              <a
                href="#question-banks"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <Shield className="h-4 w-4 mr-2" />
                Bancos de Preguntas
              </a>
            </div>
          </div>
        </nav>
      )}

      {/* Navigation for Manager */}
      {profile?.role === 'MANAGER' && (
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <a
                href="#manager-applications"
                className="border-indigo-500 text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <FileText className="h-4 w-4 mr-2" />
                Mis Aplicaciones
              </a>
            </div>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}