import React from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PublicNavbar } from '../components/PublicNavbar'
import { ToastContainer } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { Building2, Mail, Phone, MapPin } from 'lucide-react'

export function RootPublicLayout() {
  const location = useLocation()
  const { toasts, removeToast } = useToast()
  
  const showSearch = location.pathname === '/'
  const hideNavbar = location.pathname === '/login'

  React.useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Vacantes Disponibles - BinniBus',
      '/estatus': 'Consultar Estatus - BinniBus',
      '/login': 'Acceso Staff - BinniBus'
    }
    
    let title = 'BinniBus - Únete a nuestro equipo'
    
    if (titles[location.pathname]) {
      title = titles[location.pathname]
    } else if (location.pathname.startsWith('/vacantes/')) {
      if (location.pathname.includes('/aplicar')) {
        title = 'Aplicar a Vacante - BinniBus'
      } else {
        title = 'Detalle de Vacante - BinniBus'
      }
    } else if (location.pathname.startsWith('/success/')) {
      title = 'Aplicación Enviada - BinniBus'
    } else if (location.pathname.startsWith('/after-docs/')) {
      title = 'Documentos Posteriores - BinniBus'
    }
    
    document.title = title
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      {!hideNavbar && (
        <PublicNavbar showSearch={showSearch} />
      )}
      
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-gray-900">BinniBus</span>
                  <p className="text-sm text-gray-500">Transporte de calidad</p>
                </div>
              </div>
              <p className="text-body-sm text-gray-600 mb-6 max-w-md">
                Empresa líder en transporte público en Oaxaca, comprometida con brindar 
                el mejor servicio a nuestra comunidad y las mejores oportunidades laborales.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Oaxaca de Juárez, Oaxaca</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <span>+52 (951) 123-4567</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <span>carreras@binnibus.com</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Enlaces Rápidos</h3>
              <div className="space-y-3">
                <Link to="/" className="block text-sm text-gray-600 hover:text-primary-600 transition-colors duration-150">
                  Vacantes Disponibles
                </Link>
                <Link to="/estatus" className="block text-sm text-gray-600 hover:text-primary-600 transition-colors duration-150">
                  Consultar Estatus
                </Link>
                <Link to="/login" className="block text-sm text-gray-600 hover:text-primary-600 transition-colors duration-150">
                  Acceso Staff
                </Link>
              </div>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Soporte</h3>
              <div className="space-y-3">
                <a href="#" className="block text-sm text-gray-600 hover:text-primary-600 transition-colors duration-150">
                  Preguntas Frecuentes
                </a>
                <a href="#" className="block text-sm text-gray-600 hover:text-primary-600 transition-colors duration-150">
                  Contacto
                </a>
                <a href="#" className="block text-sm text-gray-600 hover:text-primary-600 transition-colors duration-150">
                  Política de Privacidad
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200/50 text-center">
            <p className="text-sm text-gray-500">
              © 2025 BinniBus. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
      
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}