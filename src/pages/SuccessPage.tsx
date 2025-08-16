import React from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Copy, Search, Upload, ArrowRight, Sparkles, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export function SuccessPage() {
  const { folio } = useParams<{ folio: string }>()
  const navigate = useNavigate()
  
  if (!folio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-h2 font-bold text-gray-900 mb-4">Folio no válido</h2>
          <Button onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  const copyFolio = () => {
    navigator.clipboard.writeText(folio)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4"
    >
      <div className="max-w-lg w-full">
        <Card className="text-center overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-success-500 to-success-600 p-8 text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-h2 font-bold mb-3">
              ¡Aplicación Enviada!
            </h1>
            <p className="text-white/90 leading-relaxed">
              Tu aplicación ha sido recibida exitosamente. Te contactaremos pronto.
            </p>
          </div>
          
          <CardContent className="p-8 space-y-8">
            {/* Folio */}
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-6 border border-primary-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tu folio de aplicación:
              </label>
              <div className="flex items-center space-x-3">
                <code className="flex-1 bg-white px-4 py-3 rounded-xl border border-gray-200 text-lg font-mono text-center font-bold text-primary-600">
                  {folio}
                </code>
                <Button variant="ghost" size="sm" onClick={copyFolio} className="hover:bg-primary-100">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Guarda este folio para consultar el estado de tu aplicación
              </p>
            </div>

            {/* Next Steps */}
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-accent-500" />
                Próximos pasos
              </h3>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                    <FileText className="w-4 h-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Revisión de documentos</p>
                    <p className="text-xs text-gray-600">Verificaremos que toda tu documentación esté completa</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center mr-4">
                    <Calendar className="w-4 h-4 text-secondary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Programación de entrevistas</p>
                    <p className="text-xs text-gray-600">Te contactaremos para agendar las entrevistas</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center mr-4">
                    <CheckCircle className="w-4 h-4 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Notificaciones por email</p>
                    <p className="text-xs text-gray-600">Recibirás actualizaciones en cada etapa del proceso</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button onClick={() => navigate(`/estatus/${folio}`)} size="lg" className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Consultar Estado
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => navigate(`/after-docs/${folio}`)} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Docs. Posteriores
                </Button>
                
                <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
                  Inicio
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}