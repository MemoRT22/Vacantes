import React from 'react'
import { motion } from 'framer-motion'
import { Check, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TimelineStep {
  id: string
  title: string
  description?: string
  status: 'completed' | 'current' | 'pending' | 'error'
  date?: string
}

interface TimelineProps {
  steps: TimelineStep[]
  className?: string
}

const statusIcons = {
  completed: CheckCircle,
  current: Clock,
  pending: Clock,
  error: AlertCircle
}

const statusColors = {
  completed: 'bg-success-500 text-white border-success-500',
  current: 'bg-primary-500 text-white border-primary-500',
  pending: 'bg-gray-200 text-gray-500 border-gray-200',
  error: 'bg-error-500 text-white border-error-500'
}

const lineColors = {
  completed: 'bg-success-500',
  current: 'bg-gradient-to-b from-success-500 to-gray-200',
  pending: 'bg-gray-200',
  error: 'bg-error-500'
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const Icon = statusIcons[step.status]
        const isLast = index === steps.length - 1
        
        return (
          <div key={step.id} className="relative flex items-start">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-5 top-12 w-0.5 h-8 bg-gray-200" />
            )}
            
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3, type: "spring" }}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl border-2 shadow-sm z-10 bg-white',
                statusColors[step.status]
              )}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
            
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.1, duration: 0.3 }}
              className="ml-6 flex-1 min-w-0 pb-8"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className={cn(
                  'text-base font-semibold',
                  step.status === 'completed' ? 'text-success-700' :
                  step.status === 'current' ? 'text-primary-700' :
                  step.status === 'error' ? 'text-error-700' :
                  'text-gray-500'
                )}>
                  {step.title}
                </h3>
                {step.date && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    {step.date}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
              )}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}