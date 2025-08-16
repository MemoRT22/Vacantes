import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface CardProps {
  className?: string
  hover?: boolean
  children: React.ReactNode
}

export function Card({ className, hover = false, children }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        'bg-white rounded-2xl border border-gray-200/50 shadow-sm',
        hover && 'hover:shadow-lg hover:border-gray-300/50 cursor-pointer',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn('p-6 pb-4', className)}>
      {children}
    </div>
  )
}

export function CardContent({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn('p-6 pt-4 border-t border-gray-100', className)}>
      {children}
    </div>
  )
}