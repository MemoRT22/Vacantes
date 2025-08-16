import React from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Award, 
  Clock, 
  MapPin, 
  TrendingUp, 
  Shield,
  Heart,
  Star
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/Button'

const highlights = [
  {
    icon: Users,
    title: 'Equipo Profesional',
    description: 'Únete a un equipo comprometido con la excelencia en el transporte público.',
    color: 'primary'
  },
  {
    icon: Award,
    title: 'Reconocimiento',
    description: 'Valoramos tu talento y ofrecemos oportunidades de crecimiento profesional.',
    color: 'secondary'
  },
  {
    icon: Clock,
    title: 'Horarios Flexibles',
    description: 'Opciones de horarios que se adaptan a tu estilo de vida.',
    color: 'accent'
  },
  {
    icon: MapPin,
    title: 'Ubicación Estratégica',
    description: 'Trabajamos en las mejores rutas de Oaxaca con infraestructura moderna.',
    color: 'success'
  },
  {
    icon: TrendingUp,
    title: 'Crecimiento',
    description: 'Empresa en constante expansión con nuevas oportunidades.',
    color: 'secondary'
  },
  {
    icon: Shield,
    title: 'Estabilidad',
    description: 'Seguridad laboral y beneficios competitivos para nuestro equipo.',
    color: 'primary'
  }
]

const colorClasses = {
  primary: 'bg-primary-100 text-primary-600',
  secondary: 'bg-secondary-100 text-secondary-600',
  accent: 'bg-accent-100 text-accent-600',
  success: 'bg-success-100 text-success-600'
}

export function WhyChooseUs() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium mb-6">
            <Heart className="w-4 h-4 mr-2" />
            ¿Por qué BinniBus?
          </div>
          
          <h2 className="text-h1 font-bold text-gray-900 mb-6">
            Más que un trabajo,{' '}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              una familia
            </span>
          </h2>
          
          <p className="text-body-lg text-gray-600 max-w-3xl mx-auto">
            Somos más que una empresa de transporte, somos una familia comprometida 
            con brindar el mejor servicio a nuestra comunidad y el mejor ambiente laboral a nuestro equipo.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {highlights.map((highlight, index) => {
            const Icon = highlight.icon
            
            return (
              <motion.div
                key={highlight.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group"
              >
                <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-gray-200/50 hover:border-gray-300/50 transition-all duration-300 h-full">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-200",
                      colorClasses[highlight.color as keyof typeof colorClasses]
                    )}
                  >
                    <Icon className="w-7 h-7" />
                  </motion.div>
                  
                  <h3 className="text-h4 font-semibold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors duration-200">
                    {highlight.title}
                  </h3>
                  
                  <p className="text-body-sm text-gray-600 leading-relaxed">
                    {highlight.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-3xl p-8 text-white">
            <Star className="w-8 h-8 mx-auto mb-4 text-accent-300" />
            <h3 className="text-h3 font-bold mb-3">¿Listo para unirte?</h3>
            <p className="text-body mb-6 opacity-90">
              Explora nuestras vacantes disponibles y encuentra la oportunidad perfecta para ti.
            </p>
            <Button 
              variant="secondary" 
              size="lg" 
              className="bg-white text-primary-600 hover:bg-gray-50"
              onClick={() => document.getElementById('vacancies')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Vacantes Disponibles
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}