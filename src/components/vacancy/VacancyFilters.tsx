import React from 'react'
import { motion } from 'framer-motion'
import { Filter, SortAsc, X, Briefcase, Users } from 'lucide-react'
import { Button } from '../ui/Button'

interface VacancyFiltersProps {
  filters: {
    type: string
    sort: string
  }
  onFilterChange: (filters: { type: string; sort: string }) => void
  resultCount?: number
}

const typeOptions = [
  { value: '', label: 'Todos', icon: null },
  { value: 'ADMINISTRATIVO', label: 'Administrativo', icon: Briefcase },
  { value: 'OPERATIVO', label: 'Operativo', icon: Users }
]

const sortOptions = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'alphabetical', label: 'A-Z' },
  { value: 'type', label: 'Por tipo' }
]

export function VacancyFilters({ filters, onFilterChange, resultCount }: VacancyFiltersProps) {
  const hasActiveFilters = filters.type !== ''

  const clearFilters = () => {
    onFilterChange({ type: '', sort: 'recent' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl border border-gray-200/50 p-6 mb-8 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            Filtros
          </div>
          
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option) => {
              const Icon = option.icon
              const isActive = filters.type === option.value
              
              return (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onFilterChange({ ...filters, type: option.value })}
                  className={cn(
                    'inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {option.label}
                </motion.button>
              )
            })}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Sort and Results */}
        <div className="flex items-center justify-between sm:justify-end gap-4">
          {resultCount !== undefined && (
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
              {resultCount} vacante{resultCount !== 1 ? 's' : ''}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <SortAsc className="w-4 h-4 text-gray-400" />
            <select
              value={filters.sort}
              onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  )
}