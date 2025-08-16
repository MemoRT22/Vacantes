import React from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  status?: 'RevisionDeDocumentos' | 'EntrevistaConRH' | 'EntrevistaConManager' | 'Evaluando' | 'Aceptado' | 'Rechazado'
  type?: 'ADMINISTRATIVO' | 'OPERATIVO'
  className?: string
  children: React.ReactNode
}

const statusColors = {
  RevisionDeDocumentos: 'bg-[#5B78B0]/10 text-[#5B78B0] border-[#5B78B0]/20',
  EntrevistaConRH: 'bg-[#00AFA5]/10 text-[#00AFA5] border-[#00AFA5]/20',
  EntrevistaConManager: 'bg-[#8D418C]/10 text-[#8D418C] border-[#8D418C]/20',
  Evaluando: 'bg-[#F7AC2F]/10 text-[#F7AC2F] border-[#F7AC2F]/20',
  Aceptado: 'bg-[#5BAE37]/10 text-[#5BAE37] border-[#5BAE37]/20',
  Rechazado: 'bg-[#E94C64]/10 text-[#E94C64] border-[#E94C64]/20'
}

const typeColors = {
  ADMINISTRATIVO: 'bg-primary-100 text-primary-700 border-primary-200',
  OPERATIVO: 'bg-accent-100 text-accent-700 border-accent-200'
}

const variants = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  secondary: 'bg-gray-50 text-gray-600 border-gray-200',
  destructive: 'bg-error-100 text-error-700 border-error-200',
  outline: 'bg-transparent text-gray-700 border-gray-300'
}

export function Badge({ 
  variant = 'default', 
  status, 
  type, 
  className, 
  children 
}: BadgeProps) {
  let colorClass = variants[variant]
  
  if (status) {
    colorClass = statusColors[status]
  } else if (type) {
    colorClass = typeColors[type]
  }

  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-150',
      colorClass,
      className
    )}>
      {children}
    </span>
  )
}