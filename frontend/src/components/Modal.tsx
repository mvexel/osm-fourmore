import type { ReactNode } from 'react'

interface ModalProps {
  children: ReactNode
}

export function Modal({ children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {children}
    </div>
  )
}
