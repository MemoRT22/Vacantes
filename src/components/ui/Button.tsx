import React from 'react'
import { motion } from 'framer-motion'
import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  asChild?: boolean
  children: React.ReactNode
}

const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-[var(--primary)] shadow-md hover:shadow-lg',
  secondary: 'bg-purple text-white hover:bg-purple/90 focus:ring-[var(--purple)] shadow-md hover:shadow-lg',
  destructive: 'bg-red text-white hover:bg-red/90 focus:ring-[var(--red)] shadow-md hover:shadow-lg',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-[var(--primary)]',
  link: 'bg-transparent text-primary hover:text-primary/80 underline-offset-4 hover:underline focus:ring-[var(--primary)]'
}

const buttonSizes = {
  sm: 'px-4 py-2 text-sm h-9 rounded-lg',
  md: 'px-6 py-3 text-base h-11 rounded-xl',
  lg: 'px-8 py-4 text-lg h-12 rounded-xl'
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  asChild = false,
  className, 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  const Comp = asChild ? Slot : motion.button
  
  if (asChild) {
    return (
      <Slot
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[44px]',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        {...props}
      >
        {children}
      </Slot>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'min-h-[44px]',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </motion.button>
  )
}