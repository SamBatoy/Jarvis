import { useState } from 'react'

// Destructive actions need a confirmation step, never fire immediately.
// Two-click inline pattern instead of a native confirm() so it matches the
// app's own styling and is testable/stylable like everything else.
export default function ConfirmDeleteButton({ onConfirm, pending, label = 'Delete' }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">Delete this?</span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="cursor-pointer font-medium text-red-600 transition-colors duration-150 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
        >
          {pending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="cursor-pointer text-neutral-600 transition-colors duration-150 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400"
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
      className="cursor-pointer text-sm text-red-600 transition-colors duration-150 hover:underline dark:text-red-400"
    >
      {label}
    </button>
  )
}
