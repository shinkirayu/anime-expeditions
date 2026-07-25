import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

interface ToastApi {
  notify: (kind: ToastKind, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, kind, title, message }])
      const ttl = kind === 'error' ? 8000 : 4500
      setTimeout(() => remove(id), ttl)
    },
    [remove]
  )

  const api: ToastApi = {
    notify,
    success: (t, m) => notify('success', t, m),
    error: (t, m) => notify('error', t, m),
    info: (t, m) => notify('info', t, m)
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => remove(t.id)}>
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-msg">{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
