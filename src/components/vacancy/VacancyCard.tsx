import React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Clock, ArrowRight, Briefcase, Users } from 'lucide-react'
import { Card, CardContent, CardFooter } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface VacancyCardProps {
  vacancy: {
    id: string
    position: string
    type: 'ADMINISTRATIVO' | 'OPERATIVO'
    objetivos?: string
    created_at: string
  }
  onViewDetails: (id: string) => void
}

export function VacancyCard({ vacancy, onViewDetails }: VacancyCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const TypeIcon = vacancy.type === 'ADMINISTRATIVO' ? Briefcase : Users

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <Card hover className="h-full flex flex-col group">
        <CardContent className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200",
                vacancy.type === 'ADMINISTRATIVO' 
                  ? "bg-primary-100 text-primary-600 group-hover:bg-primary-200" 
                  : "bg-accent-100 text-accent-600 group-hover:bg-accent-200"
              )}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <Badge type={vacancy.type} className="text-xs">
                {vacancy.type === 'ADMINISTRATIVO' ? 'Administrativo' : 'Operativo'}
              </Badge>
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-h4 font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
            {vacancy.position}
          </h3>
          
          {/* Description */}
          {vacancy.objetivos && (
            <p className="text-body-sm text-gray-600 mb-4 line-clamp-3">
              {truncateText(vacancy.objetivos, 120)}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex items-center text-xs text-gray-500 space-x-4 mt-auto">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span>Publicado {formatDate(vacancy.created_at)}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              <span>Oaxaca</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-6 pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full group-hover:bg-primary-50 group-hover:text-primary-600 transition-all duration-200"
            onClick={() => onViewDetails(vacancy.id)}
          >
            Ver detalles
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}