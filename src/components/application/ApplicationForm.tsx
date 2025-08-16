import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, FileText, User, Mail, Phone, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PublicVacancyDetail, DOC_TYPE_LABELS } from '../../lib/publicApi'

interface ApplicationFormProps {
  vacancy: PublicVacancyDetail
  onSubmit: (formData: any) => Promise<void>
  loading: boolean
}

export function ApplicationForm({ vacancy, onSubmit, loading }: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    files: [] as Array<{ doc: string; file: File }>
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const necessaryDocs = vacancy.required_docs?.filter(doc => doc.phase === 'NECESARIO') || []

  const handleFileChange = (doc: string, file: File | null) => {
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, [doc]: 'El archivo no debe exceder 10MB' }))
        return
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, [doc]: 'Solo se permiten archivos PDF, JPG o PNG' }))
        return
      }

      // Clear error and add file
      setErrors(prev => ({ ...prev, [doc]: '' }))
      setFormData(prev => ({
        ...prev,
        files: [
          ...prev.files.filter(f => f.doc !== doc),
          { doc, file }
        ]
      }))
    } else {
      // Remove file
      setFormData(prev => ({
        ...prev,
        files: prev.files.filter(f => f.doc !== doc)
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es requerido'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de correo electrónico inválido'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido'
    }

    // Check required documents
    necessaryDocs.forEach(docReq => {
      const hasFile = formData.files.some(f => f.doc === docReq.doc)
      if (!hasFile) {
        newErrors[docReq.doc] = 'Este documento es requerido'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setErrors({ submit: err.message })
    }
  }

  const getFileForDoc = (doc: string) => {
    return formData.files.find(f => f.doc === doc)?.file
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <Card>
        <CardHeader>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-h2 font-bold text-gray-900 mb-3">
              Aplicar a {vacancy.position}
            </h1>
            <p className="text-body text-gray-600 max-w-2xl mx-auto">
              Completa el formulario y sube los documentos requeridos para aplicar a esta vacante.
              Asegúrate de que toda la información sea correcta.
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-h4 font-semibold text-gray-900">Información Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Nombre Completo"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    error={errors.full_name}
                    placeholder="Tu nombre completo"
                  />
                </div>

                <Input
                  label="Correo Electrónico"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={errors.email}
                  placeholder="tu@email.com"
                />

                <Input
                  label="Teléfono"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={errors.phone}
                  placeholder="555-123-4567"
                />
              </div>
            </div>

            {/* Required Documents */}
            {necessaryDocs.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-error-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-error-600" />
                  </div>
                  <div>
                    <h3 className="text-h4 font-semibold text-gray-900">Documentos Requeridos</h3>
                    <p className="text-body-sm text-gray-600">Sube los documentos necesarios para tu aplicación</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {necessaryDocs.map((docReq, index) => {
                    const file = getFileForDoc(docReq.doc)
                    const hasError = errors[docReq.doc]
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-2xl p-6 hover:border-gray-300 transition-colors duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {DOC_TYPE_LABELS[docReq.doc] || docReq.doc}
                            </h4>
                            <p className="text-xs text-error-600 font-medium">Requerido</p>
                          </div>
                          {file && (
                            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-success-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(docReq.doc, e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all duration-200 cursor-pointer"
                          />
                          
                          {file && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center justify-between p-3 bg-success-50 rounded-xl border border-success-200"
                            >
                              <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                                <span className="text-sm text-success-700 font-medium truncate">{file.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFileChange(docReq.doc, null)}
                                className="text-error-500 hover:text-error-700 transition-colors duration-150 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          )}
                          
                          {hasError && (
                            <div className="flex items-center p-3 bg-error-50 rounded-xl border border-error-200">
                              <AlertCircle className="w-4 h-4 text-error-500 mr-2" />
                              <p className="text-sm text-error-600">{hasError}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-6 py-4 rounded-xl">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-3" />
                  <span>{errors.submit}</span>
                </div>
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full shadow-lg">
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Enviando Aplicación...' : 'Enviar Aplicación'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}