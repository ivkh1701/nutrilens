import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { ToastPayload } from '../lib/types'

interface ToastContextValue {
  show: (message: string, type?: ToastPayload['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null)
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, type: ToastPayload['type'] = 'default') => {
    if (timer) clearTimeout(timer)
    setToast({ message, type })
    const t = setTimeout(() => setToast(null), 2800)
    setTimer(t)
  }, [timer])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          className={`toast${toast.type === 'error' ? ' error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
