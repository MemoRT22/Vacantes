import React from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { VacancyGrid } from '../components/vacancy/VacancyGrid'
import { VacancyFilters } from '../components/vacancy/VacancyFilters'
import { WhyChooseUs } from '../components/WhyChooseUs'
import { HeroSection } from '../components/sections/HeroSection'
import { useVacancies } from '../hooks/useVacancies'

export function HomePage() {
  const [searchParams] = useSearchParams()
  const {
    vacancies,
    loading,
    error,
    filters,
    handleFilterChange,
    handleViewDetails
  } = useVacancies()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      <HeroSection />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" id="vacancies">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-h2 font-bold text-gray-900 mb-4">
            Vacantes Disponibles
          </h2>
          <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
            Explora las oportunidades laborales que tenemos para ti y encuentra 
            el puesto que mejor se adapte a tu perfil profesional.
          </p>
        </motion.div>
        
        <VacancyFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          resultCount={vacancies?.total}
        />
        
        <VacancyGrid
          vacancies={vacancies?.items || []}
          loading={loading}
          error={error}
          onViewDetails={handleViewDetails}
          onClearFilters={() => handleFilterChange({ type: '', sort: 'recent' })}
        />
      </div>
      
      <WhyChooseUs />
    </motion.div>
  )
}