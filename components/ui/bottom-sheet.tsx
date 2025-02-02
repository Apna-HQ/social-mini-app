"use client"

import { ReactNode } from "react"

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl p-4 z-50 animate-in slide-in-from-bottom">
        {children}
      </div>
    </>
  )
}

interface SelectOptionProps {
  value: string
  label: string
  onClick: () => void
}

export function SelectOption({ value, label, onClick }: SelectOptionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-accent rounded-md transition-colors"
    >
      {label}
    </button>
  )
}