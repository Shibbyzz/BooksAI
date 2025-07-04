'use client'

import React from 'react'
import { InputProps } from '@/types'

const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  className = '',
  ...props
}) => {
  const inputClasses = `
    flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm 
    ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium 
    placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
    focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed 
    disabled:opacity-50 ${error ? 'border-destructive focus-visible:ring-destructive' : ''} ${className}
  `.trim()

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helper && !error && (
        <p className="text-sm text-muted-foreground">{helper}</p>
      )}
    </div>
  )
}

export default Input
