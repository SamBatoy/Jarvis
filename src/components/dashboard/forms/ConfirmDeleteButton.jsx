import { useState } from 'react'

// Destructive actions need a confirmation step, never fire immediately.
// Two-click inline pattern instead of a native confirm() so it matches the
// app's own styling and is testable/stylable like everything else.
export default function ConfirmDeleteButton({ onConfirm, pending, label = 'Delete' }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-hud-muted">Delete this?</span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="cursor-pointer font-medium text-hud-crit transition-colors duration-150 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="cursor-pointer text-hud-muted transition-colors duration-150 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="cursor-pointer text-sm text-hud-crit transition-colors duration-150 hover:underline"
    >
      {label}
    </button>
  )
}
