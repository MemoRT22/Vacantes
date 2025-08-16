import React from 'react'
import { motion } from 'framer-motion'
import { Filter, SortAsc, X, Users } from 'lucide-react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

interface VacancyFiltersProps {
  filters: {
    type: string
    sort: string
  }
  onFilterChange: (filters: { type: string; sort: string }) => void
  resultCount?: number
}

const typeOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'OPERATIVO', label: 'Operativo' }
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
      className="bg-white rounded-card border border-gray-200 p-4 mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            <span>Filtros:</span>
          </div>
          
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onFilterChange({ ...filters, type: option.value })}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filters.type === option.value
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                }`}
              >
                {option.label}
              </button>
            ))}
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
        <div className="flex items-center gap-4">
          {resultCount !== undefined && (
            <span className="text-sm text-gray-600">
              {resultCount} vacante{resultCount !== 1 ? 's' : ''}
            </span>
          )}
          
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-gray-400" />
            <select
              value={filters.sort}
              onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
              className="text-sm border border-gray-300 rounded-card px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
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