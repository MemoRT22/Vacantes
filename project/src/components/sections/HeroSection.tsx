import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, TrendingUp, Users, MapPin, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export function HeroSection() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newParams = new URLSearchParams(searchParams)
    if (localSearch.trim()) {
      newParams.set('q', localSearch.trim())
    } else {
      newParams.delete('q')
    }
    
    navigate(`/?${newParams.toString()}`)
  }

  React.useEffect(() => {
    setLocalSearch(searchParams.get('q') || '')
  }, [searchParams])

  const stats = [
    { icon: Users, label: 'Empleados', value: '500+', color: 'text-primary-500' },
    { icon: MapPin, label: 'Rutas', value: '25+', color: 'text-secondary-500' },
    { icon: TrendingUp, label: 'Años', value: '15+', color: 'text-accent-500' }
  ]

  return (
    <section className="relative bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-accent-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Únete al equipo líder en transporte
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-h1 lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
          >
            Tu carrera en{' '}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              BinniBus
            </span>{' '}
            comienza aquí
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-body-lg text-gray-600 mb-12 max-w-2xl mx-auto"
          >
            Descubre oportunidades de crecimiento profesional en la empresa líder 
            de transporte público en Oaxaca. Construye tu futuro con nosotros.
          </motion.p>

          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-16"
          >
            <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white rounded-2xl shadow-lg border border-gray-200/50">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Buscar por puesto o palabra clave..."
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none rounded-xl"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg"
                  className="sm:w-auto w-full"
                >
                  Buscar Vacantes
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                  className="text-center group"
                >
                  <div className={cn(
                    "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-all duration-200",
                    "bg-gray-50 group-hover:bg-gray-100"
                  )}>
                    <Icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}