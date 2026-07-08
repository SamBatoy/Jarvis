import clsx from 'clsx'
import ProposalCard from './ProposalCard'

export default function MessageList({ messages }) {
  return (
    <div aria-live="polite" aria-atomic="false" className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 && (
        <p className="text-sm text-hud-muted">
          Ask Jarvis about your schedule, todos, deadlines, or say something like “study for the chem exam on the
          20th”.
        </p>
      )}
      {messages.map((m, i) => (
        <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
          <div
            className={clsx(
              'max-w-[85%] rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap',
              m.role === 'user'
                ? 'border-hud-accent/40 bg-hud-accent/15 [box-shadow:0_0_12px_rgba(56,225,255,0.08)]'
                : 'border-hud-accent/15 bg-hud-panel/60'
            )}
          >
            {m.content}
            {m.proposal && <ProposalCard proposal={m.proposal} source="chat" />}
          </div>
        </div>
      ))}
    </div>
  )
}
