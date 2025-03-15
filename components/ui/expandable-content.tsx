"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface ExpandableContentProps {
  content: React.ReactNode
  maxHeight?: number
  characterThreshold?: number
  contentLength?: number
}

/**
 * ExpandableContent - A reusable component that handles content expansion/collapse
 * 
 * @param content - The content to render (can be a string or React node)
 * @param maxHeight - Maximum height in pixels before truncation (default: 120)
 * @param characterThreshold - Character count threshold to determine if content should be truncatable (default: 280)
 * @param contentLength - Length of content for string length comparison (only needed if content is not a string)
 */
export function ExpandableContent({
  content,
  maxHeight = 120,
  characterThreshold = 280,
  contentLength,
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Determine if content should be truncatable
  const contentSize = typeof content === 'string' ? content.length : contentLength
  const shouldTruncate = contentSize ? contentSize > characterThreshold : false

  return (
    <div className="relative">
      <div 
        className={!isExpanded && shouldTruncate ? `max-h-[${maxHeight}px] overflow-hidden` : ""}
        style={!isExpanded && shouldTruncate ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        {content}
      </div>
      
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="text-primary hover:text-primary/90 text-sm font-medium flex items-center gap-1 mt-2"
        >
          {isExpanded ? (
            <>
              Show less
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}