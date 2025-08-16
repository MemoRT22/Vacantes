import React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Clock, Users, FileText, CheckCircle, ArrowRight, Briefcase, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { PublicVacancyDetail, DOC_TYPE_LABELS } from '../../lib/publicApi'

interface VacancyDetailProps {
  vacancy: PublicVacancyDetail
  onApply: () => void
}

export function VacancyDetail({ vacancy, onApply }: VacancyDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
  }

  const necessaryDocs = vacancy.required_docs?.filter(doc => doc.phase === 'NECESARIO') || []
  const afterDocs = vacancy.required_docs?.filter(doc => doc.phase === 'DESPUES') || []

  const TypeIcon = vacancy.type === 'ADMINISTRATIVO' ? Briefcase : Users

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TypeIcon className="w-6 h-6 text-white" />
                </div>
                <Badge 
                  type={vacancy.type} 
                  className="bg-white/20 text-white border-white/30"
                >
                  {vacancy.type === 'ADMINISTRATIVO' ? 'Administrativo' : 'Operativo'}
                </Badge>
              </div>
              
              <h1 className="text-h1 font-bold mb-4">
                {vacancy.position}
              </h1>
              
              <div className="flex items-center space-x-6 text-white/80 text-sm">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Oaxaca, México</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Publicado {formatDate(vacancy.created_at)}</span>
                </div>
              </div>
            </div>
            
            <Button 
              size="lg" 
              onClick={onApply} 
              className="ml-6 bg-white text-primary-600 hover:bg-gray-50 shadow-lg"
            >
              Aplicar ahora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {vacancy.objetivos && (
            <Card>
              <CardHeader>
                <h2 className="text-h3 font-semibold text-gray-900">Objetivos del Puesto</h2>
              </CardHeader>
              <CardContent>
                <p className="text-body text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {vacancy.objetivos}
                </p>
              </CardContent>
            </Card>
          )}

          {vacancy.funciones && (
            <Card>
              <CardHeader>
                <h2 className="text-h3 font-semibold text-gray-900">Funciones Principales</h2>
              </CardHeader>
              <CardContent>
                <p className="text-body text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {vacancy.funciones}
                </p>
              </CardContent>
            </Card>
          )}

          {vacancy.conocimientos_tecnicos && (
            <Card>
              <CardHeader>
                <h2 className="text-h3 font-semibold text-gray-900">Conocimientos Técnicos</h2>
              </CardHeader>
              <CardContent>
                <p className="text-body text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {vacancy.conocimientos_tecnicos}
                </p>
              </CardContent>
            </Card>
          )}

          {vacancy.habilidades && (
            <Card>
              <CardHeader>
                <h2 className="text-h3 font-semibold text-gray-900">Habilidades Requeridas</h2>
              </CardHeader>
              <CardContent>
                <p className="text-body text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {vacancy.habilidades}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requirements */}
          {(vacancy.escolaridad || vacancy.experiencia_minima) && (
            <Card>
              <CardHeader>
                <h3 className="text-h4 font-semibold text-gray-900">Requisitos</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {vacancy.escolaridad && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                      Escolaridad
                    </h4>
                    <p className="text-sm text-gray-700">{vacancy.escolaridad}</p>
                  </div>
                )}
                {vacancy.experiencia_minima && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <div className="w-2 h-2 bg-secondary-500 rounded-full mr-3"></div>
                      Experiencia
                    </h4>
                    <p className="text-sm text-gray-700">{vacancy.experiencia_minima}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Required Documents */}
          {(necessaryDocs.length > 0 || afterDocs.length > 0) && (
            <Card>
              <CardHeader>
                <h3 className="text-h4 font-semibold text-gray-900">Documentos Requeridos</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                {necessaryDocs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-error-500" />
                      Para aplicar
                    </h4>
                    <div className="space-y-2">
                      {necessaryDocs.map((doc, index) => (
                        <div key={index} className="flex items-center p-3 bg-error-50 rounded-xl border border-error-200">
                          <div className="w-2 h-2 bg-error-500 rounded-full mr-3 flex-shrink-0"></div>
                          <span className="text-sm text-error-700 font-medium">
                            {DOC_TYPE_LABELS[doc.doc] || doc.doc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {afterDocs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-success-500" />
                      Si eres aceptado
                    </h4>
                    <div className="space-y-2">
                      {afterDocs.map((doc, index) => (
                        <div key={index} className="flex items-center p-3 bg-success-50 rounded-xl border border-success-200">
                          <div className="w-2 h-2 bg-success-500 rounded-full mr-3 flex-shrink-0"></div>
                          <span className="text-sm text-success-700 font-medium">
                            {DOC_TYPE_LABELS[doc.doc] || doc.doc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Apply CTA */}
          <Card className="bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
            <CardContent className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-h3 font-semibold text-gray-900 mb-3">
                ¡Únete a nuestro equipo!
              </h3>
              <p className="text-body-sm text-gray-600 mb-6 leading-relaxed">
                Forma parte de la empresa líder en transporte público en Oaxaca 
                y construye tu futuro profesional con nosotros.
              </p>
              <Button onClick={onApply} size="lg" className="w-full shadow-lg">
                Aplicar ahora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}