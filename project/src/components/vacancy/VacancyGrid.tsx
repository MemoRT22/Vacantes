import React from 'react'
import { motion } from 'framer-motion'
import { Building2, Search, RefreshCw } from 'lucide-react'
import { VacancyCard } from './VacancyCard'
import { Button } from '../ui/Button'
import { SkeletonCard } from '../ui/Skeleton'
import { PublicVacancy } from '../../lib/publicApi'

interface VacancyGridProps {
  vacancies: PublicVacancy[]
  loading: boolean
  error: string
  onViewDetails: (id: string) => void
  onClearFilters: () => void
}

export function VacancyGrid({ 
  vacancies, 
  loading, 
  error, 
  onViewDetails, 
  onClearFilters 
}: VacancyGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-error-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-error-500" />
          </div>
          <h3 className="text-h3 font-semibold text-gray-900 mb-3">
            Error al cargar vacantes
          </h3>
          <p className="text-body text-gray-600 mb-8">
            {error}
          </p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Intentar de nuevo
          </Button>
        </div>
      </motion.div>
    )
  }

  if (!vacancies || vacancies.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-h3 font-semibold text-gray-900 mb-3">
            No hay vacantes disponibles
          </h3>
          <p className="text-body text-gray-600 mb-8">
            No encontramos vacantes que coincidan con tus criterios de búsqueda.
            Intenta con otros filtros o revisa más tarde.
          </p>
          <Button onClick={onClearFilters} variant="secondary">
            Ver todas las vacantes
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vacancies.map((vacancy, index) => (
        <motion.div
          key={vacancy.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <VacancyCard
            vacancy={vacancy}
            onViewDetails={onViewDetails}
          />
        </motion.div>
      ))}
    </div>
  )
}