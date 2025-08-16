import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, User, Menu, X, Building2 } from 'lucide-react'
import { Button } from './ui/Button'

interface PublicNavbarProps {
  showSearch?: boolean
}

export function PublicNavbar({ showSearch = false }: PublicNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newParams = new URLSearchParams(searchParams)
    if (localSearch.trim()) {
      newParams.set('q', localSearch.trim())
    } else {
      newParams.delete('q')
    }
    
    navigate(`/?${newParams.toString()}`)
  }

  React.useEffect(() => {
    setLocalSearch(searchParams.get('q') || '')
  }, [searchParams])

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0"
          >
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900">BinniBus</span>
                <p className="text-xs text-gray-500 -mt-1">Carreras</p>
              </div>
            </Link>
          </motion.div>

          {/* Search Bar - Desktop */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Buscar vacantes..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </form>
            </div>
          )}

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/estatus">Consultar Estatus</Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link to="/login">
                <User className="w-4 h-4 mr-2" />
                Acceso Staff
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Buscar vacantes..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200/50 py-4 space-y-2"
          >
            <Link 
              to="/estatus" 
              className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              onClick={() => setIsMenuOpen(false)}
            >
              Consultar Estatus
            </Link>
            <Link 
              to="/login" 
              className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              onClick={() => setIsMenuOpen(false)}
            >
              Acceso Staff
            </Link>
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}