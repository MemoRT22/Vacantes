import React from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ApplicationForm } from '../components/application/ApplicationForm'
import { useVacancyDetail } from '../hooks/useVacancyDetail'
import { useApplication } from '../hooks/useApplication'

export function ApplicationPage() {
  const { id: vacancyId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { vacancy, loading: vacancyLoading } = useVacancyDetail(vacancyId)
  const { submitApplication, loading: submitting } = useApplication()

  if (!vacancyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-h2 font-bold text-gray-900 mb-4">ID de vacante no válido</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (formData: any) => {
    try {
      const result = await submitApplication(vacancyId, formData)
      navigate(`/success/${result.folio}`)
    } catch (error) {
      console.error('Error submitting application:', error)
    }
  }

  if (vacancyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!vacancy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-h2 font-bold text-gray-900 mb-4">Vacante no encontrada</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(`/vacantes/${vacancyId}`)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a la vacante
        </Button>
        
        <ApplicationForm
          vacancy={vacancy}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </div>
    </motion.div>
  )
}