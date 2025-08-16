import React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardFooter } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <Card hover className="h-full flex flex-col">
        <CardContent className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-h3 font-semibold text-gray-900 line-clamp-2">
              {vacancy.position}
            </h3>
            <Badge type={vacancy.type}>
              {vacancy.type === 'ADMINISTRATIVO' ? 'Admin' : 'Operativo'}
            </Badge>
          </div>
          
          {vacancy.objetivos && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
              {truncateText(vacancy.objetivos, 120)}
            </p>
          )}
          
          <div className="flex items-center text-xs text-gray-500 space-x-4">
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
        
        <CardFooter>
          <Button 
            variant="primary" 
            size="sm" 
            className="w-full group"
            onClick={() => onViewDetails(vacancy.id)}
          >
            Ver detalles
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}