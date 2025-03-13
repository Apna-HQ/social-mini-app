"use client"

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyButtonProps {
  value: string
  className?: string
  size?: 'default' | 'sm' | 'icon'
  variant?: 'default' | 'ghost' | 'outline'
}

/**
 * A button that copies text to clipboard when clicked
 */
export function CopyButton({
  value,
  className = '',
  size = 'icon',
  variant = 'ghost'
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
    
    try {
      // Try the modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
          .catch(fallbackCopy)
      } else {
        fallbackCopy()
      }
    } catch (error) {
      fallbackCopy()
    }
  }
  
  // Fallback copy method using document.execCommand
  const fallbackCopy = () => {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea')
      textArea.value = value
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      
      // Select and copy
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      
      // Clean up
      document.body.removeChild(textArea)
      
      if (successful) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Fallback copy failed:', err)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}