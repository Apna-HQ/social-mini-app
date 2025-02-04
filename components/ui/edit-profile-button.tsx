"use client"

interface EditProfileButtonProps {
  name?: string
  about?: string
  onEdit: (data: { name: string; about: string }) => void
  className?: string
}

export function EditProfileButton({ name = '', about = '', onEdit, className }: EditProfileButtonProps) {
  return (
    <button
      onClick={() => onEdit({ name, about })}
      className={className}
    >
      Edit Profile
    </button>
  )
}