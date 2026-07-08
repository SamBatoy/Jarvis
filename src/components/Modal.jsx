import { useEffect, useRef } from 'react'

export default function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Solid panel bg (not the /55 glass) — modals stack on top of other
          panels, and glass-on-glass turns to mud. Corner brackets come from
          hud-panel; the solid fill just overrides its translucency. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="hud-panel max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain !bg-hud-panel p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="hud-label !text-xs">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-hud-muted transition-colors duration-150 hover:bg-hud-accent/10 hover:text-hud-text"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
