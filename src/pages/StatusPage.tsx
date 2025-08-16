import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, FileText, Calendar, Clock, CheckCircle, XCircle, Upload, User } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Timeline } from '../components/ui/Timeline'
import { getApplicationStatus, ApplicationStatus } from '../lib/publicApi'

export function StatusPage() {
  const { folio: urlFolio } = useParams<{ folio?: string }>()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    folio: urlFolio || '',
    email: ''
  })
  const [status, setStatus] = useState<ApplicationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await getApplicationStatus({
        folio: formData.folio,
        email: formData.email
      })
      setStatus(result)
      if (!urlFolio) {
        navigate(`/estatus/${formData.folio}`, { replace: true })
      }
    } catch (err: any) {
      setError(err.message)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const getTimelineSteps = (status: ApplicationStatus) => {
    return status.timeline.map(step => ({
      id: step.step,
      title: getStepTitle(step.step),
      description: step.value || undefined,
      status: step.current ? 'current' : step.reached ? 'completed' : 'pending'
    }))
  }

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'RevisionDeDocumentos':
        return 'Revisión de Documentos'
      case 'EntrevistaConRH':
        return 'Entrevista con RH'
      case 'EntrevistaConManager':
        return 'Entrevista con Manager'
      case 'Evaluando':
        return 'Evaluación Final'
      case 'Aceptado':
        return 'Aceptado'
      case 'Rechazado':
        return 'Rechazado'
      default:
        return step
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Query Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-h3 font-bold text-gray-900">Consultar Estatus</h1>
                  <p className="text-body-sm text-gray-600">
                    Ingresa tu información para consultar el estado de tu aplicación
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Folio de Aplicación"
                  type="text"
                  required
                  value={formData.folio}
                  onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                  placeholder="BIN-2024-00001"
                  helper="Formato: BIN-YYYY-#####"
                />

                <Input
                  label="Correo Electrónico"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tu@email.com"
                  helper="Usa el mismo email de tu aplicación"
                />

                {error && (
                  <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  Consultar Estatus
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {status && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-success-600" />
                    </div>
                    <div>
                      <h2 className="text-h4 font-semibold text-gray-900">Estado de tu Aplicación</h2>
                      <Badge status={status.status as any} className="mt-1">
                        {getStepTitle(status.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Folio:</span>
                    <span className="font-medium text-gray-900">{status.folio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Puesto:</span>
                    <span className="font-medium text-gray-900">{status.vacancy.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <Badge type={status.vacancy.type as any} className="text-xs">
                      {status.vacancy.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Timeline steps={getTimelineSteps(status)} />

                {/* Schedules */}
                {(status.schedules.rh || status.schedules.manager) && (
                  <div className="mt-8 p-6 bg-primary-50 rounded-xl border border-primary-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                      Citas Programadas
                    </h3>
                    <div className="space-y-3">
                      {status.schedules.rh && (
                        <div className="p-3 bg-white rounded-lg border border-primary-200">
                          <p className="text-sm font-medium text-gray-900">
                            Entrevista RH
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(status.schedules.rh.at).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            📍 {status.schedules.rh.location}
                          </p>
                        </div>
                      )}
                      {status.schedules.manager && (
                        <div className="p-3 bg-white rounded-lg border border-primary-200">
                          <p className="text-sm font-medium text-gray-900">
                            Entrevista Manager
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(status.schedules.manager.at).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            📍 {status.schedules.manager.location}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Document Status */}
                {(status.docs.necesarios.required.length > 0 || status.docs.despues.required.length > 0) && (
                  <div className="mt-8 space-y-6">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-gray-600" />
                      Estado de Documentos
                    </h3>

                    {/* Necessary Documents */}
                    {status.docs.necesarios.required.length > 0 && (
                      <div className="p-6 bg-gray-50 rounded-xl">
                        <h4 className="font-medium text-gray-800 mb-4">Documentos Necesarios</h4>
                        <div className="space-y-2">
                          {status.docs.necesarios.uploaded.map((doc, index) => (
                            <div key={index} className="flex items-center p-3 bg-success-50 rounded-lg border border-success-200">
                              <CheckCircle className="w-4 h-4 text-success-500 mr-3" />
                              <span className="text-sm text-success-700 font-medium">{doc}</span>
                            </div>
                          ))}
                          {status.docs.necesarios.pending.map((doc, index) => (
                            <div key={index} className="flex items-center p-3 bg-gray-100 rounded-lg border border-gray-200">
                              <Clock className="w-4 h-4 text-gray-400 mr-3" />
                              <span className="text-sm text-gray-600">{doc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* After Documents */}
                    {status.docs.despues.required.length > 0 && (
                      <div className="p-6 bg-secondary-50 rounded-xl border border-secondary-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-800">Documentos Posteriores</h4>
                          {status.docs.despues.can_upload && (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/after-docs/${status.folio}`)}
                              className="shadow-sm"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Subir Documentos
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {status.docs.despues.uploaded.map((doc, index) => (
                            <div key={index} className="flex items-center p-3 bg-success-50 rounded-lg border border-success-200">
                              <CheckCircle className="w-4 h-4 text-success-500 mr-3" />
                              <span className="text-sm text-success-700 font-medium">{doc}</span>
                            </div>
                          ))}
                          {status.docs.despues.pending.map((doc, index) => (
                            <div key={index} className="flex items-center p-3 bg-gray-100 rounded-lg border border-gray-200">
                              <XCircle className="w-4 h-4 text-gray-400 mr-3" />
                              <span className="text-sm text-gray-600">{doc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}