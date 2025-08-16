import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { 
  getAfterDocsProgress, 
  startAfterDocUpload, 
  uploadFileToStorage, 
  finalizeAfterDocUpload,
  AfterDocsProgress,
  DOC_TYPE_LABELS 
} from '../lib/publicApi'

export function AfterDocsPage() {
  const { folio } = useParams<{ folio: string }>()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [progress, setProgress] = useState<AfterDocsProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!folio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-h2 font-bold text-gray-900 mb-4">Folio no válido</h2>
          <Button onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  const loadProgress = async () => {
    if (!email) return

    try {
      setLoading(true)
      setError('')
      const data = await getAfterDocsProgress(folio, email)
      setProgress(data)
    } catch (err: any) {
      setError(err.message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadProgress()
  }

  const handleFileUpload = async (doc: string, file: File) => {
    try {
      setUploading(doc)
      setError('')

      // Start upload
      const uploadData = await startAfterDocUpload(folio, email, doc, file)
      
      // Upload to storage
      await uploadFileToStorage(uploadData.upload_url, file)
      
      // Finalize upload
      await finalizeAfterDocUpload(uploadData.upload_id)
      
      // Refresh progress
      await loadProgress()
      // Show success message and redirect to status
      navigate(`/estatus/${folio}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-900">Documentos Posteriores</h1>
            <p className="text-gray-600">
              Sube los documentos requeridos después de ser aceptado.
            </p>
          </CardHeader>
          
          <CardContent>
            {!progress ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  label="Correo Electrónico"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  helper="Usa el mismo email de tu aplicación"
                />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Folio:</strong> {folio}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  Verificar Documentos Pendientes
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Estado: {progress.status}</p>
                      <p className="text-sm text-gray-600">Folio: {folio}</p>
                    </div>
                    {progress.can_upload ? (
                      <CheckCircle className="w-6 h-6 text-[var(--green)]" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-[var(--yellow)]" />
                    )}
                  </div>
                </div>

                {!progress.can_upload && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                    No puedes subir documentos en este momento. Tu aplicación debe estar en estado "Aceptado".
                  </div>
                )}

                {/* Uploaded Documents */}
                {progress.uploaded.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-[var(--green)]" />
                      Documentos Subidos
                    </h3>
                    <div className="space-y-2">
                      {progress.uploaded.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-[var(--green)]">
                              {DOC_TYPE_LABELS[doc.doc] || doc.doc}
                            </p>
                            <p className="text-xs text-green-700">
                              Versión {doc.version} • {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-[var(--green)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Documents */}
                {progress.pending.length > 0 && progress.can_upload && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-[var(--yellow)]" />
                      Documentos Pendientes
                    </h3>
                    <div className="space-y-3">
                      {progress.pending.map((doc, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {DOC_TYPE_LABELS[doc] || doc}
                              </p>
                              <p className="text-sm text-gray-600">Requerido</p>
                            </div>
                            <FileText className="w-5 h-5 text-gray-400" />
                          </div>
                          
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(doc, file)
                              }
                            }}
                            disabled={uploading === doc}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                          />
                          
                          {uploading === doc && (
                            <div className="mt-2 flex items-center text-sm text-[var(--primary)]">
                              <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mr-2" />
                              Subiendo...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {progress.pending.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-[var(--green)] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      ¡Todos los documentos subidos!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Has completado la subida de todos los documentos requeridos.
                    </p>
                    <Button onClick={() => navigate(`/estatus/${folio}`)}>
                      <Search className="w-4 h-4 mr-2" />
                      Ver Estado Actualizado
                    </Button>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}