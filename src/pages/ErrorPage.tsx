import React from 'react'
import { motion } from 'framer-motion'
import { useRouteError, Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'

export function ErrorPage() {
  const error = useRouteError() as any
  const navigate = useNavigate()
  
  const is404 = error?.status === 404 || error?.message?.includes('404')
  
  React.useEffect(() => {
    document.title = is404 ? 'Página no encontrada - BinniBus' : 'Error - BinniBus'
  }, [is404])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        <Card className="text-center">
          <CardHeader className="pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-error-100 rounded-3xl flex items-center justify-center mx-auto mb-6"
            >
              <AlertTriangle className="w-10 h-10 text-error-500" />
            </motion.div>
            
            <h1 className="text-h2 font-bold text-gray-900 mb-3">
              {is404 ? 'Página no encontrada' : 'Algo salió mal'}
            </h1>
            <p className="text-body text-gray-600 leading-relaxed">
              {is404 
                ? 'La página que buscas no existe o ha sido movida. Verifica la URL o regresa al inicio.'
                : 'Ha ocurrido un error inesperado. Por favor intenta de nuevo o contacta al soporte técnico.'
              }
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button asChild size="lg" className="w-full">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Ir al inicio
              </Link>
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)} 
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver atrás
              </Button>
              
              {!is404 && (
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recargar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}