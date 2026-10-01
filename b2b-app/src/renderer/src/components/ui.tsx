import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useApp } from '@/store/app'

export function Field({
  label,
  hint,
  error,
  children,
  id
}: {
  label: string
  hint?: string
  error?: string
  id?: string
  children: (id: string) => ReactNode
}): ReactNode {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      {children(fid)}
      {hint && <span className="hint">{hint}</span>}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}): ReactNode {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' wide' : ''}`}
      aria-labelledby="modal-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {open && (
        <>
          <div className="modal-head">
            <h2 id="modal-title">{title}</h2>
            <button className="btn ghost icon sm" onClick={onClose} aria-label="Kapat">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </>
      )}
    </dialog>
  )
}

export function Toasts(): ReactNode {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span>{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Bildirimi kapat">
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }): ReactNode {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  )
}

export function Spinner({ label = 'Yükleniyor' }: { label?: string }): ReactNode {
  return (
    <span className="row" role="status">
      <span className="spinner" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Confirm({
  open,
  title,
  text,
  onCancel,
  onConfirm,
  danger,
  confirmLabel = 'Evet'
}: {
  open: boolean
  title: string
  text: string
  onCancel: () => void
  onConfirm: () => void
  danger?: boolean
  confirmLabel?: string
}): ReactNode {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>
            Vazgeç
          </button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{text}</p>
    </Modal>
  )
}
